"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { getGestureRecognizer, classifyExtendedSign, classifyTwoHandedSign, type HandLandmark, type DetectedSignResult } from '../lib/signDetector';

interface SignCameraDetectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSignDetected: (sign: string, spokenPhrase: string) => void;
  targetLanguage?: string;
  ttsEnabled?: boolean;
}

// Hand bone connections for skeleton rendering
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17]
];

export default function SignCameraDetector({
  isOpen,
  onClose,
  onSignDetected,
  targetLanguage = "English",
  ttsEnabled = true
}: SignCameraDetectorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentSign, setCurrentSign] = useState<string | null>(null);
  const [currentConfidence, setCurrentConfidence] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [engineMode, setEngineMode] = useState<'hybrid' | 'device' | 'cloud'>('hybrid');
  const [activeSource, setActiveSource] = useState<'device' | 'cloud'>('device');

  // Debounce and cooldown tracking
  const lastSpokenSignRef = useRef<string | null>(null);
  const lastSpokenTimeRef = useRef<number>(0);
  const candidateSignRef = useRef<{ sign: string; count: number; spokenPhrase: string }>({ sign: '', count: 0, spokenPhrase: '' });
  const lastCloudReqTimeRef = useRef<number>(0);
  const isCloudBusyRef = useRef<boolean>(false);

  // Floating Rnd position
  const [boxState, setBoxState] = useState({
    x: 24,
    y: 90,
    width: 320,
    height: 240
  });

  // Text-to-speech output helper
  const speakSign = useCallback((phrase: string) => {
    if (typeof window === 'undefined') return;
    if (!ttsEnabled) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      
      // Match classroom target language if possible
      if (targetLanguage.toLowerCase().includes('hindi')) {
        utterance.lang = 'hi-IN';
      } else if (targetLanguage.toLowerCase().includes('marathi')) {
        utterance.lang = 'mr-IN';
      } else if (targetLanguage.toLowerCase().includes('telugu')) {
        utterance.lang = 'te-IN';
      } else if (targetLanguage.toLowerCase().includes('kannada')) {
        utterance.lang = 'kn-IN';
      } else if (targetLanguage.toLowerCase().includes('malayalam')) {
        utterance.lang = 'ml-IN';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("SpeechSynthesis error:", e);
      setIsSpeaking(false);
    }
  }, [targetLanguage, ttsEnabled]);

  const queryCloudVision = useCallback(async (imageDataUrl: string, landmarks: any[]) => {
    const now = Date.now();
    if (now - lastCloudReqTimeRef.current < 800 || isCloudBusyRef.current) return;
    lastCloudReqTimeRef.current = now;
    isCloudBusyRef.current = true;

    try {
      // 1. Try ultra-fast Next.js serverless route with Groq Vision directly on Vercel
      let res: Response | null = await fetch('/api/recognize_sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageDataUrl,
          landmarks: landmarks,
          num_hands: landmarks.length
        })
      }).catch(() => null);

      // 2. Fallback to Python backend if local route was unreachable
      if (!res || !res.ok) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://signova-backend-baas.onrender.com";
        res = await fetch(`${backendUrl}/api/recognize_sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageDataUrl,
            landmarks: landmarks,
            num_hands: landmarks.length
          })
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data && data.sign && data.sign !== 'None' && data.confidence >= 0.75) {
          setCurrentSign(data.sign);
          setCurrentConfidence(Math.round(data.confidence * 100));
          setActiveSource('cloud');

          const curTime = Date.now();
          if ((curTime - lastSpokenTimeRef.current > 1800) || lastSpokenSignRef.current !== data.sign) {
            lastSpokenSignRef.current = data.sign;
            lastSpokenTimeRef.current = curTime;
            onSignDetected(data.sign, data.spokenPhrase);
            speakSign(data.spokenPhrase || data.sign);
          }
        }
      }
    } catch (err) {
      // non-fatal vision fallback
    } finally {
      isCloudBusyRef.current = false;
    }
  }, [onSignDetected, speakSign]);

  // Start webcam and detection loop
  useEffect(() => {
    if (!isOpen) {
      // Clean up when closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);

    async function initCameraAndModel() {
      try {
        // 1. Initialize MediaPipe Model
        const recognizer = await getGestureRecognizer();
        if (!isMounted) return;

        // 2. Request User Media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsLoading(false);

        // 3. Real-time inference loop
        let lastVideoTime = -1;

        const processFrame = () => {
          if (!isMounted) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && canvas && video.readyState >= 2) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Ensure canvas dimensions match video
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }

              ctx.clearRect(0, 0, canvas.width, canvas.height);

              if (video.currentTime !== lastVideoTime) {
                lastVideoTime = video.currentTime;
                const now = performance.now();

                try {
                  const results = recognizer.recognizeForVideo(video, now);

                  if (results && results.landmarks && results.landmarks.length > 0) {
                    setHandCount(results.landmarks.length);
                    let signResult: DetectedSignResult | null = null;

                    // 1. Check for two-handed coordinated signs (Namaste, Help, Book, Equal, Heart, Clap)
                    if (results.landmarks.length >= 2) {
                      signResult = classifyTwoHandedSign(
                        results.landmarks[0] as HandLandmark[],
                        results.landmarks[1] as HandLandmark[]
                      );
                    }

                    // 2. Single-hand fallback if two-handed sign not found
                    if (!signResult) {
                      for (let h = 0; h < results.landmarks.length; h++) {
                        const hand = results.landmarks[h] as HandLandmark[];
                        const baseGesture = results.gestures?.[h]?.[0]?.categoryName || 'None';
                        const baseScore = results.gestures?.[h]?.[0]?.score || 0;
                        const res = classifyExtendedSign(hand, baseGesture, baseScore);
                        if (res) {
                          signResult = res;
                          break;
                        }
                      }
                    }

                    // 3. Draw skeletons for ALL visible hands concurrently
                    for (let h = 0; h < results.landmarks.length; h++) {
                      drawHandSkeleton(
                        ctx,
                        results.landmarks[h] as HandLandmark[],
                        canvas.width,
                        canvas.height,
                        !!signResult
                      );
                    }

                    if (engineMode === 'cloud') {
                      // Pure cloud vision mode
                      queryCloudVision(canvas.toDataURL('image/jpeg', 0.5), results.landmarks);
                    } else if (signResult) {
                      // On-device engine detected gesture
                      setActiveSource('device');
                      setCurrentSign(signResult.sign);
                      setCurrentConfidence(Math.round(signResult.confidence * 100));

                      // Debounce: must detect the same sign for 3 frames
                      if (candidateSignRef.current.sign === signResult.sign) {
                        candidateSignRef.current.count += 1;
                      } else {
                        candidateSignRef.current = {
                          sign: signResult.sign,
                          count: 1,
                          spokenPhrase: signResult.spokenPhrase
                        };
                      }

                      // When confirmed (3 consecutive frames) & cooldown elapsed
                      const currentTime = Date.now();
                      const cooldownPassed = (currentTime - lastSpokenTimeRef.current) > 1800;
                      const isNewSign = lastSpokenSignRef.current !== signResult.sign;

                      if (candidateSignRef.current.count >= 3 && (cooldownPassed || isNewSign)) {
                        lastSpokenSignRef.current = signResult.sign;
                        lastSpokenTimeRef.current = currentTime;

                        // Emit to classroom subtitle overlay
                        onSignDetected(signResult.sign, signResult.spokenPhrase);

                        // Speak aloud
                        speakSign(signResult.spokenPhrase);
                      }
                    } else {
                      // Hand visible: if in hybrid mode and local rules didn't match, send to cloud vision
                      if (engineMode === 'hybrid') {
                        queryCloudVision(canvas.toDataURL('image/jpeg', 0.5), results.landmarks);
                      }
                      candidateSignRef.current = { sign: '', count: 0, spokenPhrase: '' };
                    }
                  } else {
                    // No hands in view
                    setHandCount(0);
                    setCurrentSign(null);
                    setCurrentConfidence(null);
                    candidateSignRef.current = { sign: '', count: 0, spokenPhrase: '' };
                  }
                } catch (recogErr) {
                  // Ignore minor frame sync glitch
                }
              }
            }
          }

          animFrameIdRef.current = requestAnimationFrame(processFrame);
        };

        animFrameIdRef.current = requestAnimationFrame(processFrame);
      } catch (err: any) {
        console.error("Failed to start Sign Camera:", err);
        if (isMounted) {
          setIsLoading(false);
          setErrorMessage(err.message || "Camera access denied or unavailable.");
        }
      }
    }

    initCameraAndModel();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isOpen, onSignDetected, speakSign]);

  // Helper to draw skeleton bones and emerald joints
  function drawHandSkeleton(
    ctx: CanvasRenderingContext2D,
    landmarks: HandLandmark[],
    w: number,
    h: number,
    isRecognized: boolean
  ) {
    // Draw bones (connecting lines)
    ctx.lineWidth = 3;
    ctx.strokeStyle = isRecognized ? 'rgba(52, 211, 153, 0.85)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // Draw glowing joint points
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      const isTip = [4, 8, 12, 16, 20].includes(i);
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isTip ? 5 : 3.5, 0, 2 * Math.PI);
      ctx.fillStyle = isTip 
        ? (isRecognized ? '#10b981' : '#38bdf8') 
        : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    }
  }

  if (!isOpen) return null;

  return (
    <Rnd
      size={{ width: boxState.width, height: boxState.height }}
      position={{ x: boxState.x, y: boxState.y }}
      onDragStop={(e, d) => setBoxState(prev => ({ ...prev, x: d.x, y: d.y }))}
      onResizeStop={(e, direction, ref, delta, position) => {
        setBoxState({
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
          ...position
        });
      }}
      minWidth={240}
      minHeight={180}
      bounds="window"
      className="z-[260] pointer-events-auto select-none"
      dragHandleClassName="sign-cam-drag-handle"
    >
      <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-950/90 backdrop-blur-2xl border-2 border-emerald-500/50 shadow-[0_12px_45px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.25)] flex flex-col relative group">
        
        {/* Header / Drag Handle */}
        <div className="sign-cam-drag-handle flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-white/10 cursor-move">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Sign Detection</span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">AI Live</span>
            </span>
            {handCount > 0 && (
              <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                <span>{handCount >= 2 ? "👐 2 Hands (ISL)" : "🖐️ 1 Hand"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Multi-Engine Selector (Approach 1 vs Approach 2) */}
            <button
              type="button"
              onClick={() => setEngineMode(m => m === 'hybrid' ? 'device' : m === 'device' ? 'cloud' : 'hybrid')}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer select-none flex items-center gap-1 bg-black/60 border-white/20 hover:border-white/40"
              title="Click to toggle engine: Hybrid (Device + Cloud AI) -> On-Device (30fps) -> Cloud AI Vision"
            >
              {engineMode === 'hybrid' && <span className="text-amber-300">✨ Hybrid AI</span>}
              {engineMode === 'device' && <span className="text-emerald-400">⚡ 30fps Device</span>}
              {engineMode === 'cloud' && <span className="text-cyan-300">☁️ Cloud Vision</span>}
            </button>

            {isSpeaking && (
              <span className="text-[10px] font-bold text-teal-300 flex items-center gap-1 animate-pulse">
                <i className="fas fa-volume-high text-[9px]"></i>
                <span>Speaking</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="w-5 h-5 rounded-full hover:bg-white/20 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close Sign Camera"
            >
              <i className="fas fa-times text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* Camera Viewport & Canvas Skeleton */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 z-20">
              <i className="fas fa-circle-notch fa-spin text-emerald-400 text-xl"></i>
              <span className="text-xs font-medium text-gray-300">Starting Sign Camera...</span>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center gap-2 bg-slate-950 z-20">
              <i className="fas fa-triangle-exclamation text-amber-400 text-2xl"></i>
              <span className="text-xs text-red-300 font-medium">{errorMessage}</span>
              <button
                onClick={onClose}
                className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />

          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
          />

          {/* Active Detected Sign Badge (Bottom Overlay) */}
          {currentSign && (
            <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between px-3 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-emerald-400/50 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-base">👋</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-300 tracking-wide">
                  {currentSign}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {currentConfidence && (
                  <span className="text-[10px] font-mono font-bold text-gray-300 bg-white/10 px-1.5 py-0.5 rounded">
                    {currentConfidence}%
                  </span>
                )}
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                  activeSource === 'cloud' 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {activeSource === 'cloud' ? 'AI Cloud' : 'Device'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
