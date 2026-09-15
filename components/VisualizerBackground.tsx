"use client";

import React, { useEffect, useRef } from 'react';

interface VisualizerBackgroundProps {
  isRecording: boolean;
}

export default function VisualizerBackground({ isRecording }: VisualizerBackgroundProps) {
  const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visualizerStreamRef = useRef<MediaStream | null>(null);

  // Expose this via a global event or simply handle audio purely here!
  // Wait, if we put audio here, we duplicate getUserMedia if STT is running?
  // No, STT doesn't use getUserMedia, it uses Web Speech API. 
  // But wait, the VAD needs the `average` volume to flush the STT!
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex justify-center items-center">
      <div 
        ref={(el) => { visualizerRefs.current[0] = el; }}
        className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen transition-transform duration-100 ease-out" 
      />
      <div 
        ref={(el) => { visualizerRefs.current[1] = el; }}
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen transition-transform duration-100 ease-out" 
      />
      <div 
        ref={(el) => { visualizerRefs.current[2] = el; }}
        className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] mix-blend-screen transition-transform duration-100 ease-out" 
      />
    </div>
  );
}
