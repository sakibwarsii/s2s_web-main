"use client";

import { MouseEvent } from 'react';

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
  if (!playerState.hasQueue && !playerState.hasHistory && !playerState.playing) {
    return null;
  }

  return (
    <aside 
      aria-label="Demo playback controls"
      className={`fixed bottom-20 xs:bottom-22 sm:bottom-24 left-1/2 -translate-x-1/2 z-[140] flex items-center gap-2 sm:gap-3 bg-black/80 hover:bg-black/90 backdrop-blur-2xl border border-emerald-500/30 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.2)] transition-all duration-300 pointer-events-auto select-none ${className}`}
    >
      {/* 1. Undo 5s Button */}
      <button 
        type="button"
        onClick={() => skipBackward(5)} 
        className="group relative flex items-center justify-center gap-1 w-11 h-11 sm:w-13 sm:h-13 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all shadow-md cursor-pointer"
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
          onClick={resume} 
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white transition-all shadow-lg shadow-emerald-600/40 border border-emerald-300/40 cursor-pointer"
          title="Play (Resume Lecture)"
          aria-label="Resume demo lecture"
        >
          <i className="fas fa-play text-sm sm:text-base ml-0.5"></i>
        </button>
      ) : (
        <button 
          type="button"
          onClick={pause} 
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 active:scale-95 text-white transition-all shadow-lg shadow-amber-600/40 border border-amber-300/40 cursor-pointer"
          title="Pause Demo Lecture"
          aria-label="Pause demo lecture"
        >
          <i className="fas fa-pause text-sm sm:text-base"></i>
        </button>
      )}

      {/* 3. Redo 5s Button */}
      <button 
        type="button"
        onClick={() => skipForward(5)} 
        className="group relative flex items-center justify-center gap-1 w-11 h-11 sm:w-13 sm:h-13 px-2 sm:px-3 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white transition-all shadow-md cursor-pointer"
        title="Redo 5 seconds (Fast Forward)"
        aria-label="Redo 5 seconds"
      >
        <span className="text-[10px] sm:text-xs font-bold text-gray-200 font-mono tracking-tight">5s</span>
        <i className="fas fa-rotate-right text-xs sm:text-sm group-hover:rotate-45 transition-transform duration-200 text-emerald-400"></i>
      </button>
    </aside>
  );
}

