"use client";

import React, { useState, useEffect } from 'react';

interface ControlBarProps {
  isRecording: boolean;
  isSpeaking?: boolean;
  toggleMic: () => void;
  isScreenshare: boolean;
  toggleScreenshare: () => void;
  setShowSettings: (val: boolean) => void;
  setShowAITools?: (val: boolean) => void;
  onUploadClick: () => void;
  onToggleBoard?: () => void;
  isBoardOpen?: boolean;
  isAutoHidden?: boolean;
  onUserActivity?: () => void;
}

export default function ControlBar({ 
  isRecording, isSpeaking = false, toggleMic, 
  isScreenshare, toggleScreenshare, 
  setShowSettings, setShowAITools, onUploadClick,
  onToggleBoard, isBoardOpen = false,
  isAutoHidden = false, onUserActivity
}: ControlBarProps) {
  return (
    <div 
      className={`absolute bottom-3 pb-[env(safe-area-inset-bottom,0px)] sm:bottom-6 landscape:bottom-2 inset-x-0 flex justify-center z-[110] px-2 sm:px-3 transition-all duration-500 ease-out pointer-events-none ${
        isAutoHidden 
          ? 'translate-y-[calc(100%+3.5rem)] opacity-0 pointer-events-none' 
          : 'translate-y-0 opacity-100'
      }`}
      onMouseEnter={onUserActivity}
      onMouseMove={onUserActivity}
      onTouchStart={onUserActivity}
    >
      <div 
        className="flex items-center gap-1.5 sm:gap-3 bg-gradient-to-t from-black/95 via-slate-950/90 to-slate-900/85 backdrop-blur-2xl px-3 py-2 sm:px-6 sm:py-2.5 rounded-full border border-white/25 shadow-[0_14px_50px_rgba(0,0,0,0.75)] pointer-events-auto transition-all max-w-full overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseEnter={onUserActivity}
        onMouseMove={onUserActivity}
      >
        {/* Central Primary Mic Button (Elevated & Interactive) */}
        <div className="relative flex flex-col items-center">
          {isRecording && isSpeaking && (
            <>
              <div className="absolute -inset-1 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none"></div>
              <div className="absolute -inset-2.5 rounded-full bg-red-500/50 animate-pulse pointer-events-none"></div>
            </>
          )}
          
          <button id="tour-mic" onClick={toggleMic}
            className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer select-none border-2 ${
              isRecording 
                ? isSpeaking
                  ? 'bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 border-emerald-400 scale-105 shadow-[0_0_25px_rgba(239,68,68,0.9),0_0_15px_rgba(52,211,153,0.8)]'
                  : 'bg-red-600 border-emerald-400/90 shadow-[0_0_18px_rgba(52,211,153,0.6)]'
                : 'bg-gradient-to-tr from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 border-white/30 shadow-red-500/40 shadow-lg'
            }`}
            title={isRecording ? (isSpeaking ? "Capturing Voice..." : "Microphone On (Listening)") : "Turn On Microphone"}
          >
            <i className={`fas fa-microphone text-white text-base sm:text-lg ${isSpeaking ? 'animate-bounce' : ''}`}></i>
          </button>
          <span className="text-[9px] font-bold text-rose-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
            {isRecording ? "Live" : "Mic"}
          </span>
        </div>


        {/* Smart Whiteboard & Teaching Board Button */}
        {onToggleBoard && (
          <div className="relative flex flex-col items-center">
            <button id="tour-whiteboard" onClick={onToggleBoard}
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer border border-white/20 ${
                isBoardOpen 
                  ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-600/50 ring-2 ring-indigo-400 scale-105' 
                  : 'bg-gradient-to-tr from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-indigo-500/30'
              }`}
              title={isBoardOpen ? "Close Smart Whiteboard" : "Open Smart Whiteboard & Teaching Tools"}
            >
              <i className="fas fa-chalkboard text-white text-base sm:text-lg"></i>
            </button>
            <span className="text-[9px] font-bold text-indigo-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
              Board
            </span>
          </div>
        )}

        {/* Screenshare & Cast Presentation Button */}
        <div className="relative flex flex-col items-center">
          <button id="tour-screenshare" onClick={toggleScreenshare}
            className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer border border-white/20 ${
              isScreenshare 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-600/50 ring-2 ring-emerald-400 scale-105' 
                : 'bg-gradient-to-tr from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/30'
            }`}
            title="Toggle Screenshare / Cast Layout"
          >
            <i className="fas fa-desktop text-white text-base sm:text-lg"></i>
          </button>
          <span className="text-[9px] font-bold text-emerald-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
            Cast
          </span>
        </div>

        {/* Media & PDF Upload Button */}
        <div className="relative flex flex-col items-center">
          <button id="tour-ai-tools" onClick={onUploadClick}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-orange-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer border border-white/20"
            title="Upload Media (Video, PDF, Image)"
          >
            <i className="fas fa-file-arrow-up text-white text-base sm:text-lg"></i>
          </button>
          <span className="text-[9px] font-bold text-amber-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
            Upload
          </span>
        </div>

        {/* AI Tools & Interactive Demos Button */}
        {setShowAITools && (
          <div className="relative flex flex-col items-center">
            <button 
              onClick={() => setShowAITools(true)}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 shadow-pink-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer border border-white/20"
              title="AI Tools and Classroom Demos"
            >
              <i className="fas fa-graduation-cap text-white text-base sm:text-lg"></i>
            </button>
            <span className="text-[9px] font-bold text-pink-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
              Demos
            </span>
          </div>
        )}


        {/* Settings Button */}
        <div className="relative flex flex-col items-center">
          <button 
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 shadow-blue-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-1.5 sm:hover:scale-108 cursor-pointer border border-white/20"
            title="Classroom Settings"
          >
            <i className="fas fa-sliders text-white text-base sm:text-lg"></i>
          </button>
          <span className="text-[9px] font-bold text-blue-200 mt-1 uppercase tracking-tight font-mono select-none drop-shadow">
            Settings
          </span>
        </div>
      </div>
    </div>
  );
}



