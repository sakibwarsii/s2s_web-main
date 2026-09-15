"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { VisualState, VisualMode } from '../hooks/useVisualAssist';
import { DEMO_TOPICS_REGISTRY, DemoTopicSlides, DemoSlide } from '../lib/demoSlidesData';

interface VisualAssistPanelProps {
  visual: VisualState;
  visualMode: VisualMode;
  setVisualMode: (m: VisualMode) => void;
  embedded?: boolean;
  onUploadClick?: () => void;
  onFileDrop?: (file: File) => void;
  activeDemoTopic?: string | null;
  isDemoActive?: boolean;
}

export default function VisualAssistPanel({
  visual,
  visualMode,
  setVisualMode,
  embedded,
  onUploadClick,
  onFileDrop,
  activeDemoTopic,
  isDemoActive
}: VisualAssistPanelProps) {
  // Normalize topic key from title or visual url
  const matchedTopicKey = React.useMemo(() => {
    if (!activeDemoTopic && !visual.url && !visual.keyword) return null;
    const str = `${activeDemoTopic || ''} ${visual.url || ''} ${visual.keyword || ''}`.toLowerCase();
    if (str.includes('photo') || str.includes('plant')) return 'photosynthesis';
    if (str.includes('ohm') || str.includes('circuit') || str.includes('volt')) return 'ohms_law';
    if (str.includes('crow') || str.includes('thirsty') || str.includes('pitcher')) return 'thirsty_crow';
    if (str.includes('profit') || str.includes('loss') || str.includes('retail')) return 'profit_and_loss';
    if (str.includes('supply') || str.includes('demand') || str.includes('market')) return 'supply_and_demand';
    if (str.includes('indus') || str.includes('harappa') || str.includes('mohenjo')) return 'indus_valley';
    return null;
  }, [activeDemoTopic, visual.url, visual.keyword]);

  const activeTopicData: DemoTopicSlides | null = matchedTopicKey ? DEMO_TOPICS_REGISTRY[matchedTopicKey] : null;

  // Track slide index
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Compute best active image URL with instant fallback so the TV is NEVER left blank
  const defaultTopicSlide = activeTopicData?.slides?.[0]?.imagePath || null;
  const initialSlideUrl = visual.url || (isDemoActive && defaultTopicSlide) || null;

  const [activeUrl, setActiveUrl] = useState<string | null>(initialSlideUrl);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize incoming visual.url or demo activation without ever blanking the TV
  useEffect(() => {
    const candidate = visual.url || (isDemoActive && defaultTopicSlide) || null;
    if (!candidate) return;

    // If candidate matches slide_(\d+).svg, sync slide index
    const match = candidate.match(/slide_(\d+)\.svg/i);
    if (match && activeTopicData) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < activeTopicData.slides.length) {
        setCurrentSlideIndex(idx);
      }
    }

    if (candidate !== activeUrl) {
      // Preload image before switching to ensure zero blank flashes
      if (typeof window !== 'undefined') {
        const img = new Image();
        img.src = candidate;
        img.onload = () => {
          setActiveUrl(candidate);
          setIsFlipping(true);
          setTimeout(() => setIsFlipping(false), 500);
        };
        img.onerror = () => {
          // Fallback gracefully without leaving screen blank
          if (defaultTopicSlide && candidate !== defaultTopicSlide) {
            setActiveUrl(defaultTopicSlide);
          }
        };
      } else {
        setActiveUrl(candidate);
      }
    }
  }, [visual.url, isDemoActive, defaultTopicSlide, activeTopicData, activeUrl]);

  // When demo topic changes, immediately reset and display slide 1
  useEffect(() => {
    setCurrentSlideIndex(0);
    if (defaultTopicSlide) {
      setActiveUrl(defaultTopicSlide);
    }
  }, [matchedTopicKey, defaultTopicSlide]);

  const currentSlide: DemoSlide | null = activeTopicData ? activeTopicData.slides[currentSlideIndex] : null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (onFileDrop) {
        onFileDrop(file);
      } else if (onUploadClick) {
        onUploadClick();
      }
    }
  };

  // Determine if a slide or image is ready to display
  const effectiveImageUrl = activeUrl || (isDemoActive && defaultTopicSlide) || null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full h-full overflow-hidden transition-colors duration-500 select-none ${
        isDragging
          ? 'bg-gradient-to-br from-[#0f3824] via-[#0b2b1c] to-[#071d13] ring-2 ring-emerald-400'
          : 'bg-gradient-to-br from-[#0c2419] via-[#081d14] to-[#05140d]'
      }`}
      style={{
        backgroundImage: 'radial-gradient(rgba(52, 211, 153, 0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Ambient green chalkboard shading & vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%), linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.35) 100%)'
        }}
      />

      {/* Top Banner on the Green Board */}
      <div className="absolute top-2.5 sm:top-3 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between pointer-events-auto gap-2">
        {activeTopicData ? (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-lg">
            <span className="text-sm">{activeTopicData.icon}</span>
            <span className="text-emerald-300 text-xs sm:text-sm font-bold tracking-wide">
              {activeTopicData.topicTitle}
            </span>
          </div>
        ) : visual.keyword ? (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-lg">
            <span className="text-sm">🎯</span>
            <span className="text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
              {visual.keyword}
            </span>
          </div>
        ) : null}
      </div>

      {/* Main Slide Presentation Stage: Rock-solid continuous presentation with zero blank frames */}
      {effectiveImageUrl ? (
        <div className="absolute inset-0 p-2 sm:p-4 pt-8 sm:pt-10 pb-4 flex items-center justify-center [perspective:1400px]">
          <div className={`w-full h-full relative flex items-center justify-center transition-transform duration-500 ${isFlipping ? 'scale-[0.98]' : 'scale-100'}`}>
            <img
              src={effectiveImageUrl}
              alt={currentSlide?.title || visual.keyword || 'Chalkboard Slide'}
              className="w-full h-full object-contain rounded-xl drop-shadow-2xl transition-opacity duration-300"
              onError={() => {
                // If specific slide fails, fallback to default slide of the topic so TV is never left blank
                if (defaultTopicSlide && effectiveImageUrl !== defaultTopicSlide) {
                  setActiveUrl(defaultTopicSlide);
                }
              }}
            />
            {/* Subtle dynamic teaching pulse highlight */}
            <div className="absolute inset-0 pointer-events-none rounded-xl border border-emerald-400/20 shadow-[inset_0_0_24px_rgba(52,211,153,0.12)]" />
          </div>
        </div>
      ) : (
        /* Classroom TV Empty Slate: Prominent, elegant, pure-white chalk typography */
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 sm:p-5 text-center pointer-events-none select-none gap-1.5 sm:gap-2.5 max-w-full overflow-hidden">
          <h3
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            className={`text-white font-sans font-extrabold tracking-[0.12em] sm:tracking-[0.16em] uppercase whitespace-nowrap drop-shadow-[0_4px_24px_rgba(0,0,0,0.95)] opacity-95 leading-none transition-all ${
              visualMode === 'visual'
                ? "text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
                : "text-2xl xs:text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl"
            }`}
          >
            SIGNOVA
          </h3>
          <p
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
            className={`text-white font-sans font-medium tracking-wide italic drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] opacity-90 max-w-[88%] px-2 transition-all ${
              visualMode === 'visual'
                ? "text-xs sm:text-base md:text-lg lg:text-xl"
                : "text-[10px] xs:text-xs sm:text-xs md:text-sm lg:text-base"
            }`}
          >
            Where every voice finds a Sign.
          </p>
        </div>
      )}
    </div>
  );
}
