"use client";

import React from "react";

interface MobileInteractiveDockProps {
  isRecording: boolean;
  isSpeaking?: boolean;
  toggleMic: () => void;
  isWhiteboardOpen: boolean;
  onToggleBoard: () => void;
  onOpenAITools: () => void;
  onUploadClick: () => void;
  visualMode: "classroom" | "visual" | "focus" | string;
  onToggleVisualMode: () => void;
  onOpenSettings: () => void;
  isActivelyTeaching?: boolean;
  isDemoActive?: boolean;
  onBack: () => void;
  isAutoHidden?: boolean;
  onUserActivity?: () => void;
}

export default function MobileInteractiveDock({
  isRecording,
  isSpeaking = false,
  toggleMic,
  isWhiteboardOpen,
  onToggleBoard,
  onOpenAITools,
  onUploadClick,
  visualMode,
  onToggleVisualMode,
  onOpenSettings,
  isActivelyTeaching = false,
  isDemoActive = false,
  onBack,
  isAutoHidden = false,
  onUserActivity,
}: MobileInteractiveDockProps) {
  return (
    <div
      className={`fixed bottom-2 pb-[env(safe-area-inset-bottom,0px)] inset-x-0 z-[120] px-3 pointer-events-none transition-all duration-400 ease-out flex flex-col items-center gap-2 ${
        isAutoHidden
          ? "translate-y-[130%] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100"
      }`}
      onTouchStart={onUserActivity}
    >
      {/* Top Quick Status Ribbon (shown during teaching, demo, or whiteboard) */}
      {(isActivelyTeaching || isDemoActive || isWhiteboardOpen) && (
        <div className="flex items-center gap-2 pointer-events-auto bg-black/85 backdrop-blur-xl border border-white/20 px-3 py-1 rounded-full shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600/80 hover:bg-indigo-500 px-2.5 py-1 rounded-full active:scale-95 transition-all shadow-md"
            title="Return to previous screen"
          >
            <i className="fas fa-arrow-left text-[11px]"></i>
            <span>Back</span>
          </button>
          <span className="text-[11px] text-gray-300 font-medium">
            {isDemoActive ? "Demo Playing" : isWhiteboardOpen ? "Whiteboard Active" : "Presentation"}
          </span>
        </div>
      )}

      {/* Main Touch Action Dock */}
      <div
        className="w-full max-w-md bg-gradient-to-t from-black/95 via-black/85 to-slate-900/85 backdrop-blur-2xl border border-white/20 rounded-[28px] p-1.5 shadow-[0_12px_45px_rgba(0,0,0,0.85)] pointer-events-auto flex items-center justify-between"
        onTouchStart={onUserActivity}
      >
        {/* Whiteboard / Chalkboard Button */}
        <button
          onClick={onToggleBoard}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-90 touch-manipulation cursor-pointer ${
            isWhiteboardOpen
              ? "bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/30"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
          title="Open Whiteboard"
        >
          <i className="fas fa-chalkboard text-base"></i>
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Board</span>
        </button>

        {/* AI Tools / Demos Button */}
        <button
          onClick={onOpenAITools}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 touch-manipulation cursor-pointer"
          title="Demo Classes and AI Tools"
        >
          <i className="fas fa-graduation-cap text-base text-pink-400"></i>
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Demos</span>
        </button>

        {/* Central Primary Mic Button (Elevated) */}
        <div className="relative -mt-5 mx-1">
          {isRecording && isSpeaking && (
            <>
              <div className="absolute -inset-1 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none"></div>
              <div className="absolute -inset-2.5 rounded-full bg-red-500/50 animate-pulse pointer-events-none"></div>
            </>
          )}
          <button
            onClick={toggleMic}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-90 touch-manipulation cursor-pointer select-none border-2 ${
              isRecording
                ? isSpeaking
                  ? "bg-gradient-to-tr from-red-600 via-rose-500 to-pink-500 border-emerald-400 scale-110 shadow-[0_0_25px_rgba(239,68,68,0.9)]"
                  : "bg-red-600 border-emerald-400/90 shadow-[0_0_15px_rgba(52,211,153,0.6)]"
                : "bg-gradient-to-br from-red-500 to-rose-600 border-white/40 hover:brightness-110 shadow-red-500/50"
            }`}
            title={isRecording ? "Listening to Speech..." : "Tap to Speak"}
          >
            <i className={`fas fa-microphone text-white text-lg ${isSpeaking ? "animate-bounce" : ""}`}></i>
            <span className="text-[8px] text-white/95 font-bold uppercase tracking-wider mt-0.5">
              {isRecording ? "Live" : "Mic"}
            </span>
          </button>
        </div>


        {/* Upload Media / PDF */}
        <button
          onClick={onUploadClick}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 touch-manipulation cursor-pointer"
          title="Upload PDF or Video"
        >
          <i className="fas fa-file-arrow-up text-base text-amber-400"></i>
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Upload</span>
        </button>

        {/* Mode Switcher: Classroom <-> Visual Mode */}
        <button
          onClick={onToggleVisualMode}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all active:scale-90 touch-manipulation cursor-pointer ${
            visualMode === "visual"
              ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/30"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
          title="Switch Visual / Classroom Mode"
        >
          <i className={`fas ${visualMode === "visual" ? "fa-expand" : "fa-table-columns"} text-base`}></i>
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">
            {visualMode === "visual" ? "Cinema" : "Split"}
          </span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-90 touch-manipulation cursor-pointer"
          title="Classroom Settings"
        >
          <i className="fas fa-sliders text-base text-blue-400"></i>
          <span className="text-[10px] font-semibold mt-0.5 tracking-tight">Settings</span>
        </button>
      </div>
    </div>
  );
}
