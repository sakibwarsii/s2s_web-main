"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type { PlayChunk } from './useCWASA';

interface UseSignSocketsProps {
  setSubtitles: (text: string, isFinal?: boolean) => void;
  enqueueSiGML: (sigmlArray: string[]) => void;
  /** Used ONLY for "final" mic results — bundles text+sigml+audio into one
   *  chunk so sign playback and TTS audio share the same clock (see the
   *  comment at the "final" branch below for why this matters). */
  enqueueChunks: (chunks: PlayChunk[]) => void;
  wsTeacherRef: React.MutableRefObject<WebSocket | null>;
  onTeacherOpen?: () => void;
}

export function useSignSockets({ setSubtitles, enqueueSiGML, enqueueChunks, wsTeacherRef, onTeacherOpen }: UseSignSocketsProps) {
  const wsDisplayRef = useRef<WebSocket | null>(null);
  const lastFinalReceivedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Use refs for callbacks to prevent reconnect loops on every render
  const callbacksRef = useRef({ setSubtitles, enqueueSiGML, enqueueChunks, onTeacherOpen });
  useEffect(() => {
    callbacksRef.current = { setSubtitles, enqueueSiGML, enqueueChunks, onTeacherOpen };
  }, [setSubtitles, enqueueSiGML, enqueueChunks, onTeacherOpen]);

  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return 'default';
    try {
      // Check query param first (e.g. ?room=xyz)
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room') || params.get('session');
      if (queryRoom && queryRoom.trim()) {
        return queryRoom.trim();
      }

      let sid = sessionStorage.getItem('signova_session_id') || localStorage.getItem('signova_session_id');
      if (!sid || sid === 'default' || sid.trim() === '') {
        sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        sessionStorage.setItem('signova_session_id', sid);
        localStorage.setItem('signova_session_id', sid);
      }
      return sid;
    } catch (e) {
      return 'sess_' + Math.random().toString(36).substring(2, 9);
    }
  }, []);

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('signova_session_id') || 'sess_' + Math.random().toString(36).substring(2, 9);
    }
    return 'default';
  });

  const resetSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    const newSid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    sessionStorage.setItem('signova_session_id', newSid);
    localStorage.setItem('signova_session_id', newSid);
    setCurrentSessionId(newSid);
    // Reload to guarantee 100% clean isolate WebSockets
    window.location.reload();
  }, []);

  useEffect(() => {
    const getWsBaseUrl = () => {
      const explicit = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (explicit) {
        return explicit.replace(/^http/i, 'ws').replace(/\/+$/, '');
      }
      // If deployed on Vercel or cloud, Vercel serverless functions cannot proxy WebSockets.
      // Always route to live Render WebSocket backend.
      if (typeof window !== 'undefined' && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')) {
        return 'wss://signova-backend-baas.onrender.com';
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}`;
    };

    const sessionId = getSessionId();
    setCurrentSessionId(sessionId);

    const connectDisplay = () => {
      const wsUrl = `${getWsBaseUrl()}/ws/display?session_id=${encodeURIComponent(sessionId)}`;
      console.log("[Signova] Connecting Display WebSocket to:", wsUrl);
      wsDisplayRef.current = new WebSocket(wsUrl);
      
      wsDisplayRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { setSubtitles, enqueueSiGML, enqueueChunks } = callbacksRef.current;
          
          if (data.type === "partial_text_only") {
            setSubtitles(data.text + "...", false);
          } else if (data.type === "partial_sigml") {
            if (data.sigml && data.sigml.length > 0) enqueueSiGML(data.sigml);
          } else if (data.type === "final") {
            const rawText = (data.text || '').trim();
            const now = Date.now();
            
            // Client-side duplicate guard: ignore identical text within 4 seconds
            if (rawText && rawText.toLowerCase() === lastFinalReceivedRef.current.text.toLowerCase() && (now - lastFinalReceivedRef.current.time < 4000)) {
              console.log("[Signova] Ignored duplicate final subtitle from socket:", rawText);
              return;
            }
            lastFinalReceivedRef.current = { text: rawText, time: now };

            enqueueChunks([{
              text: rawText,
              sigml: data.sigml || [],
              audio_base64: data.audio || undefined
            }]);
          }
        } catch (e) {
          console.warn("[Signova] Display message parse error:", e);
        }
      };

      wsDisplayRef.current.onclose = () => {
        console.warn("[Signova] Display socket closed, reconnecting in 2s...");
        setTimeout(connectDisplay, 2000);
      };
    };

    const connectTeacher = () => {
      const wsUrl = `${getWsBaseUrl()}/ws/teacher?session_id=${encodeURIComponent(sessionId)}`;
      console.log("[Signova] Connecting Teacher WebSocket to:", wsUrl);
      wsTeacherRef.current = new WebSocket(wsUrl);
      
      wsTeacherRef.current.onopen = () => {
        console.log(`[Signova] Isolated Teacher WS Connected (Session: ${sessionId})`);
        callbacksRef.current.onTeacherOpen?.();
      };
      
      wsTeacherRef.current.onclose = () => {
        console.warn("[Signova] Teacher socket closed, reconnecting in 2s...");
        setTimeout(connectTeacher, 2000);
      };
    };

    connectDisplay();
    connectTeacher();

    return () => {
      if (wsDisplayRef.current) wsDisplayRef.current.close();
      if (wsTeacherRef.current) wsTeacherRef.current.close();
    };
  }, [wsTeacherRef, getSessionId]);

  return { sessionId: currentSessionId, resetSession };
}
