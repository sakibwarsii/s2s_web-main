"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';

interface PlayerControlsProps {
  playerState: {
    hasQueue: boolean;
    hasHistory: boolean;
    paused: boolean;
    playing?: boolean;
  };
  skipBackward: (seconds?: number) => void;
  skipForward: (seconds?: number) => void;
  pause: () => void;
  resume: () => void;
  className?: string;
}

export default function PlayerControls({
  playerState,
  skipBackward,
  skipForward,
  pause,
  resume,
  className = ""
}: PlayerControlsProps) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Position state for dragging
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, Math.round((window.innerWidth - 250) / 2)),
        y: Math.max(20, window.innerHeight - 85)
      };
    }
    return { x: 200, y: 500 };
  });

  const resetHideTimer = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    // Auto-hide after 5 seconds of inactivity
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 5000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [playerState.paused, playerState.playing, resetHideTimer]);

  // Window resize bounds adjustment
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 240),
        y: Math.min(prev.y, window.innerHeight - 85)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!playerState.hasQueue && !playerState.hasHistory && !playerState.playing && !playerState.paused) {
    return null;
  }

  return (
    <>
      {/* Wake-Up Proximity Zone (moving mouse near the controls' position reveals controls) */}
      {!isVisible && (
        <div
          style={{
            position: 'fixed',
            left: Math.max(0, position.x - 25),
            top: Math.max(0, position.y - 25),
            width: 340,
            height: 120,
          }}
          className="z-[135] pointer-events-auto cursor-pointer"
          onMouseEnter={resetHideTimer}
          onMouseMove={resetHideTimer}
          onTouchStart={resetHideTimer}
          title="Hover to reveal playback controls"
        />
      )}

      <Rnd
        position={position}
        onDragStop={(e, d) => {
          setPosition({ x: d.x, y: d.y });
          resetHideTimer();
        }}
        enableResizing={false}
        bounds="window"
        className={`z-[140] pointer-events-auto select-none transition-opacity duration-300 ${
          isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        dragHandleClassName="player-controls-drag-handle"
      >
        <aside
          aria-label="Demo playback controls"
          onMouseEnter={resetHideTimer}
          onMouseMove={resetHideTimer}
          className={`flex items-center gap-1.5 sm:gap-2.5 bg-black/90 hover:bg-black/95 backdrop-blur-2xl border border-emerald-500/50 px-2 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.3)] transition-all ${className}`}
        >
          {/* Drag Handle */}
          <div
            className="player-controls-drag-handle flex items-center justify-center cursor-move text-gray-400 hover:text-white px-1.5 py-2"
            title="Drag to reposition controls"
          >
            <i className="fas fa-grip-vertical text-xs"></i>
          </div>

          {/* 1. Undo 5s Button */}
          <button
            type="button"
            onClick={() => {
              skipBackward(5);
              resetHideTimer();
            }}
            className="group relative flex items-center justify-center gap-1 w-10 h-10 sm:w-12 sm:h-12 px-2 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all shadow-md cursor-pointer"
            title="Undo 5 seconds (Rewind)"
            aria-label="Undo 5 seconds"
          >
            <i className="fas fa-rotate-left text-xs sm:text-sm group-hover:-rotate-45 transition-transform duration-200 text-emerald-400"></i>
            <span className="text-[10px] sm:text-xs font-bold text-gray-200 font-mono tracking-tight">5s</span>
          </button>

          {/* 2. Pause / Play Button */}
          {playerState.paused ? (
            <button
              type="button"
              onClick={() => {
                resume();
                resetHideTimer();
              }}
              className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white transition-all shadow-lg shadow-emerald-600/40 border border-emerald-300/40 cursor-pointer"
              title="Play (Resume Lecture)"
              aria-label="Resume demo lecture"
            >
              <i className="fas fa-play text-sm sm:text-base ml-0.5"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                pause();
                resetHideTimer();
              }}
              className="relative flex items-center justify-center w-11 h-11 sm:w-13 sm:h-13 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 active:scale-95 text-white transition-all shadow-lg shadow-amber-600/40 border border-amber-300/40 cursor-pointer"
              title="Pause Lecture"
              aria-label="Pause lecture"
            >
              <i className="fas fa-pause text-sm sm:text-base"></i>
            </button>
          )}

          {/* 3. Redo 5s Button */}
          <button
            type="button"
            onClick={() => {
              skipForward(5);
              resetHideTimer();
            }}
            className="group relative flex items-center justify-center gap-1 w-10 h-10 sm:w-12 sm:h-12 px-2 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all shadow-md cursor-pointer"
            title="Redo 5 seconds (Fast Forward)"
            aria-label="Redo 5 seconds"
          >
            <span className="text-[10px] sm:text-xs font-bold text-gray-200 font-mono tracking-tight">5s</span>
            <i className="fas fa-rotate-right text-xs sm:text-sm group-hover:rotate-45 transition-transform duration-200 text-emerald-400"></i>
          </button>
        </aside>
      </Rnd>
    </>
  );
}

