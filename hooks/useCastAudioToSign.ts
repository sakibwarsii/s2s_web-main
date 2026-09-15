"use client";

import { useRef, useState, useCallback } from 'react';
import { formatProperSubtitles } from '../lib/subtitleUtils';

interface UseCastAudioToSignProps {
  wsTeacherRef: React.MutableRefObject<WebSocket | null>;
  targetLanguage: string;
  onSubtitles: (text: string, isFinal?: boolean) => void;
  enqueueSiGML: (sigmlArray: string[], text?: string) => void;
}

export function useCastAudioToSign({
  wsTeacherRef,
  targetLanguage,
  onSubtitles,
  enqueueSiGML
}: UseCastAudioToSignProps) {
  const [isCastAudioActive, setIsCastAudioActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // PCM collection & VAD refs
  const isSpeakingRef = useRef(false);
  const speakingDecayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpokenTimeRef = useRef<number>(Date.now());
  const hadSoundRef = useRef<boolean>(false);
  const pcmBufferRef = useRef<Int16Array[]>([]);
  const totalPcmSamplesRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const recentUtterancesRef = useRef<{ text: string; time: number }[]>([]);

  const targetLanguageRef = useRef(targetLanguage);
  targetLanguageRef.current = targetLanguage;

  const getSessionId = () => {
    if (typeof window === 'undefined') return 'default';
    try {
      return sessionStorage.getItem('signova_session_id') || localStorage.getItem('signova_session_id') || 'default';
    } catch (e) {
      return 'default';
    }
  };

  // Downsampler: native audio context rate -> 16,000Hz 16-bit mono PCM
  const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number = 16000): Int16Array => {
    if (inputRate === outputRate) {
      const pcm = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, buffer[i])) * 0x7FFF;
      }
      return pcm;
    }
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = Math.max(-1, Math.min(1, count > 0 ? accum / count : buffer[offsetBuffer])) * 0x7FFF;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // Convert accumulated 16kHz PCM samples into a standard WAV Blob for /api/transcribe-audio
  const pcmToWavBlob = (pcmData: Int16Array, sampleRate: number = 16000): Blob => {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);

    let offset = 44;
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true);
      offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  // Transcribe gathered speech chunk and convert to sign language
  const processSpeechChunk = useCallback(async () => {
    if (pcmBufferRef.current.length === 0 || totalPcmSamplesRef.current < 8000) {
      pcmBufferRef.current = [];
      totalPcmSamplesRef.current = 0;
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const totalSamples = totalPcmSamplesRef.current;
    const mergedPcm = new Int16Array(totalSamples);
    let offset = 0;
    for (const chunk of pcmBufferRef.current) {
      mergedPcm.set(chunk, offset);
      offset += chunk.length;
    }
    pcmBufferRef.current = [];
    totalPcmSamplesRef.current = 0;

    try {
      const wavBlob = pcmToWavBlob(mergedPcm, 16000);
      const formData = new FormData();
      formData.append("file", wavBlob, "cast_audio.wav");

      const sessId = getSessionId();
      const res = await fetch(`/api/transcribe-audio?lang=${encodeURIComponent(targetLanguageRef.current)}&session_id=${encodeURIComponent(sessId)}`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.text && !data.duplicate) {
          onSubtitles(formatProperSubtitles(data.text, true), true);
          if (data.sigml && Array.isArray(data.sigml) && data.sigml.length > 0) {
            enqueueSiGML(data.sigml, data.text);
          }
        }
      }
    } catch (err) {
      console.warn("[CastAudioToSign] Error transcribing audio slice:", err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [enqueueSiGML, onSubtitles]);

  // Starts capturing from a MediaStream (e.g. from getDisplayMedia during screen/tab sharing)
  const startStreamAudio = useCallback((stream: MediaStream) => {
    if (typeof window === 'undefined') return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.info("[CastAudioToSign] No audio track found in display stream.");
      setHasAudioTrack(false);
      setIsCastAudioActive(false);
      return;
    }

    setHasAudioTrack(true);
    setIsCastAudioActive(true);

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; // Muted so scriptProcessor stays active without echoing duplicate tab audio
      gainNodeRef.current = gainNode;

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedLevel = Math.min(rms * 8, 1);
        setAudioLevel(normalizedLevel);

        if (rms > 0.007) {
          lastSpokenTimeRef.current = Date.now();
          hadSoundRef.current = true;

          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          }
          if (speakingDecayTimerRef.current) {
            clearTimeout(speakingDecayTimerRef.current);
          }
          speakingDecayTimerRef.current = setTimeout(() => {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
          }, 600);

          const pcm16 = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
          pcmBufferRef.current.push(pcm16);
          totalPcmSamplesRef.current += pcm16.length;

          // Stream PCM directly over WebSocket
          if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
            wsTeacherRef.current.send(pcm16.buffer);
          }

          if (totalPcmSamplesRef.current >= 48000) {
            processSpeechChunk();
          }
        } else {
          const silenceDuration = Date.now() - lastSpokenTimeRef.current;
          if (hadSoundRef.current && silenceDuration > 700) {
            hadSoundRef.current = false;
            if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
              wsTeacherRef.current.send(JSON.stringify({ type: "flush" }));
            }
            if (totalPcmSamplesRef.current >= 12000) {
              processSpeechChunk();
            }
          }
        }
      };

      console.log("[CastAudioToSign] Audio capture active on cast stream.");
    } catch (err) {
      console.error("[CastAudioToSign] Failed to initialize stream audio processing:", err);
    }
  }, [processSpeechChunk, wsTeacherRef]);

  // Starts capturing from an HTMLVideoElement (e.g. uploaded video file)
  const startVideoElementAudio = useCallback((videoEl: HTMLVideoElement) => {
    if (typeof window === 'undefined' || !videoEl) return;

    setHasAudioTrack(true);
    setIsCastAudioActive(true);

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Route audio to destination so video sound plays through speakers
      const source = audioCtx.createMediaElementSource(videoEl);
      sourceNodeRef.current = source;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(audioCtx.destination);
      source.connect(processor);
      processor.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const normalizedLevel = Math.min(rms * 8, 1);
        setAudioLevel(normalizedLevel);

        if (rms > 0.015) {
          lastSpokenTimeRef.current = Date.now();
          hadSoundRef.current = true;

          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          }
          if (speakingDecayTimerRef.current) {
            clearTimeout(speakingDecayTimerRef.current);
          }
          speakingDecayTimerRef.current = setTimeout(() => {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
          }, 600);

          const pcm16 = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
          pcmBufferRef.current.push(pcm16);
          totalPcmSamplesRef.current += pcm16.length;

          if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
            wsTeacherRef.current.send(pcm16.buffer);
          }

          if (totalPcmSamplesRef.current >= 48000) {
            processSpeechChunk();
          }
        } else {
          const silenceDuration = Date.now() - lastSpokenTimeRef.current;
          if (hadSoundRef.current && silenceDuration > 700) {
            hadSoundRef.current = false;
            if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
              wsTeacherRef.current.send(JSON.stringify({ type: "flush" }));
            }
            if (totalPcmSamplesRef.current >= 12000) {
              processSpeechChunk();
            }
          }
        }
      };

      console.log("[CastAudioToSign] Video element audio capture active.");
    } catch (err) {
      console.warn("[CastAudioToSign] Error setting up video element audio:", err);
    }
  }, [processSpeechChunk, wsTeacherRef]);

  // Stops audio capture and cleans up
  const stopCastAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (speakingDecayTimerRef.current) {
      clearTimeout(speakingDecayTimerRef.current);
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setAudioLevel(0);
    setIsCastAudioActive(false);
    setHasAudioTrack(false);
    pcmBufferRef.current = [];
    totalPcmSamplesRef.current = 0;
  }, []);

  const toggleVideoMute = useCallback(() => {
    setIsVideoMuted(prev => !prev);
  }, []);

  return {
    isCastAudioActive,
    isSpeaking,
    audioLevel,
    hasAudioTrack,
    isVideoMuted,
    toggleVideoMute,
    startStreamAudio,
    startVideoElementAudio,
    stopCastAudio
  };
}
