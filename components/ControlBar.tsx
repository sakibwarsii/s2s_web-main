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
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const docElm = document.documentElement as any;
    const isFull = document.fullscreenElement || (document as any).webkitFullscreenElement;
    
    if (!isFull) {
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen().catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else if (docElm.webkitRequestFullscreen) {
        docElm.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

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
        className="flex items-center gap-1.5 sm:gap-4 landscape:gap-2 bg-black/60 sm:bg-white/20 backdrop-blur-2xl px-2.5 py-1.5 sm:px-8 sm:py-3.5 landscape:py-1.5 landscape:px-4 rounded-full border border-white/30 shadow-[0_10px_40px_rgba(0,0,0,0.4)] pointer-events-auto transition-all max-w-full overflow-x-auto no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onMouseEnter={onUserActivity}
        onMouseMove={onUserActivity}
      >
        <div className="relative">
          {/* Actively speaking ripple wave animation */}
          {isRecording && isSpeaking && (
            <>
              <div className="absolute -inset-1 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none"></div>
              <div className="absolute -inset-2.5 rounded-full bg-red-500/40 animate-pulse pointer-events-none"></div>
            </>
          )}
          
          <button id="tour-mic" onClick={toggleMic}
            className={`relative w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 touch-manipulation cursor-pointer select-none ${
              isRecording 
                ? isSpeaking
                  ? 'bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 scale-115 sm:scale-125 landscape:scale-110 ring-4 ring-emerald-400 shadow-[0_0_25px_rgba(239,68,68,0.9),0_0_15px_rgba(52,211,153,0.8)] z-20'
                  : 'bg-red-600 ring-2 ring-emerald-400/90 shadow-[0_0_15px_rgba(52,211,153,0.5)] z-10'
                : 'bg-red-500 hover:bg-red-400 shadow-red-500/30 sm:hover:-translate-y-2 sm:hover:scale-110 z-10'
            }`}
            title={isRecording ? (isSpeaking ? "Capturing Voice..." : "Microphone On (Listening)") : "Turn On Microphone"}
          >
            <i className={`fas fa-microphone text-white text-sm sm:text-xl landscape:text-sm ${isSpeaking ? 'animate-bounce' : ''}`}></i>
          </button>
        </div>

        {/* Smart Whiteboard & Teaching Board Button */}
        {onToggleBoard && (
          <button id="tour-whiteboard" onClick={onToggleBoard}
            className={`w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer ${
              isBoardOpen 
                ? 'bg-indigo-600 shadow-indigo-600/50 ring-2 ring-indigo-400 scale-105' 
                : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/30'
            }`}
            title={isBoardOpen ? "Close Smart Whiteboard" : "Open Smart Whiteboard & Teaching Tools"}
          >
            <i className="fas fa-chalkboard text-white text-sm sm:text-xl landscape:text-sm"></i>
          </button>
        )}

        <button id="tour-screenshare" onClick={toggleScreenshare}
          className={`w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer ${
            isScreenshare ? 'bg-green-600 shadow-green-600/50' : 'bg-green-500 hover:bg-green-400 shadow-green-500/30'
          }`}
          title="Toggle Screenshare Layout"
        >
          <i className="fas fa-desktop text-white text-sm sm:text-xl landscape:text-sm"></i>
        </button>
        <button id="tour-ai-tools" onClick={onUploadClick}
          className="w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full bg-orange-500 hover:bg-orange-400 shadow-orange-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer"
          title="Upload Media"
        >
          <i className="fas fa-upload text-white text-sm sm:text-xl landscape:text-sm"></i>
        </button>
        {setShowAITools && (
          <button 
            onClick={() => setShowAITools(true)}
            className="w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full bg-pink-500 hover:bg-pink-400 shadow-pink-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer"
            title="AI Tools"
          >
            <i className="fas fa-magic text-white text-sm sm:text-xl landscape:text-sm"></i>
          </button>
        )}
        <button 
          onClick={toggleFullscreen}
          className={`w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer ${
            isFullscreen ? 'bg-teal-600 shadow-teal-600/50' : 'bg-teal-500 hover:bg-teal-400 shadow-teal-500/30'
          }`}
          title="Toggle Fullscreen"
        >
          <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-white text-sm sm:text-xl landscape:text-sm`}></i>
        </button>
        <button 
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 sm:w-14 sm:h-14 landscape:w-10 landscape:h-10 rounded-full bg-blue-500 hover:bg-blue-400 shadow-blue-500/30 shadow-lg flex items-center justify-center transition-all duration-300 active:scale-95 sm:hover:-translate-y-2 sm:hover:scale-110 cursor-pointer"
          title="Settings"
        >
          <i className="fas fa-cog text-white text-sm sm:text-xl landscape:text-sm"></i>
        </button>
      </div>
    </div>
  );
}



