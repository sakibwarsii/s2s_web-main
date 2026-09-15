"use client";

import React, { useState, useEffect, useRef } from 'react';
import { formatProperSubtitles } from '../lib/subtitleUtils';

interface SubtitlesOverlayProps {
  subtitles: string;
  isSpeaking?: boolean;
}

export default function SubtitlesOverlay({ subtitles, isSpeaking = false }: SubtitlesOverlayProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const formatted = formatProperSubtitles(subtitles, false);
    if (formatted) {
      setDisplayedText(formatted);
      setIsVisible(true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    } else {
      // Keep previous sentence visible for 3.5s so students have comfortable time to read
      if (displayedText && !hideTimerRef.current) {
        hideTimerRef.current = setTimeout(() => {
          setIsVisible(false);
          setDisplayedText("");
          hideTimerRef.current = null;
        }, 3500);
      }
    }
  }, [subtitles]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!isVisible || !displayedText) return null;

  return (
    <div className="absolute bottom-20 sm:bottom-28 md:bottom-32 landscape:bottom-16 inset-x-0 flex flex-col items-center z-[100] pointer-events-none px-3 sm:px-6 transition-all duration-300 animate-in fade-in zoom-in-95">
      {/* High-contrast frosted glass with generous margin above control bar */}
      <div 
        className="bg-black/90 backdrop-blur-2xl px-4 py-2.5 sm:px-8 sm:py-4 landscape:py-2 landscape:px-5 rounded-2xl sm:rounded-3xl border border-white/25 shadow-[0_14px_45px_rgba(0,0,0,0.8)] max-w-[94%] sm:max-w-[82%] landscape:max-w-[70%] max-h-[16vh] sm:max-h-[22vh] landscape:max-h-[18vh] overflow-y-auto no-scrollbar pointer-events-auto select-none transition-all duration-300 flex flex-col items-center gap-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {isSpeaking && (
          <div className="flex items-center gap-1.5 self-center pb-0.5 animate-in fade-in duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Live Speech
            </span>
          </div>
        )}
        <p
          className="text-sm sm:text-2xl md:text-3xl landscape:text-base font-semibold text-center leading-snug tracking-wide text-white drop-shadow-md select-none font-sans"
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.7)' }}
        >
          {displayedText}
        </p>
      </div>
    </div>
  );
}
