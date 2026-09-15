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
  isCuratedDemo?: boolean;
}

function EducationalIllustration({ subject, keyword }: { subject: string; keyword?: string | null }) {
  const s = (subject || '').toLowerCase();
  const k = (keyword || '').toLowerCase();

  if (s.includes('physics') || k.includes('circuit') || k.includes('volt') || k.includes('current') || k.includes('atom') || k.includes('gravity') || k.includes('motion')) {
    return (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)] shrink-0 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.9" />
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(30 50 50)" strokeDasharray="4 2" />
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(-30 50 50)" strokeDasharray="4 2" />
        <ellipse cx="50" cy="50" rx="42" ry="16" transform="rotate(90 50 50)" strokeDasharray="4 2" />
        <circle cx="85" cy="50" r="3" fill="#67e8f9" />
        <circle cx="20" cy="35" r="3" fill="#67e8f9" />
        <circle cx="50" cy="90" r="3" fill="#67e8f9" />
      </svg>
    );
  }

  if (s.includes('bio') || k.includes('plant') || k.includes('photo') || k.includes('cell') || k.includes('leaf') || k.includes('dna')) {
    return (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M50 15 C25 25 20 65 50 85 C80 65 75 25 50 15 Z" fill="rgba(16,185,129,0.2)" />
        <path d="M50 15 L50 85" strokeWidth="2" />
        <path d="M50 35 Q35 30 30 40" strokeWidth="2" />
        <path d="M50 50 Q35 45 32 55" strokeWidth="2" />
        <path d="M50 35 Q65 30 70 40" strokeWidth="2" />
        <path d="M50 50 Q65 45 68 55" strokeWidth="2" />
        <circle cx="85" cy="20" r="8" fill="#fbbf24" stroke="none" />
        <path d="M85 7 L85 11" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <path d="M72 20 L76 20" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
        <path d="M76 29 L79 26" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }

  if (s.includes('chem') || k.includes('acid') || k.includes('molecule') || k.includes('reaction') || k.includes('element')) {
    return (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-teal-300 drop-shadow-[0_0_12px_rgba(45,212,191,0.5)] shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M42 20 L58 20 M50 20 L50 40 L28 80 C24 86 30 90 38 90 L62 90 C70 90 76 86 72 80 L50 40" strokeLinecap="round" />
        <path d="M34 72 Q50 68 66 72" strokeWidth="2" fill="rgba(45,212,191,0.3)" />
        <circle cx="45" cy="78" r="3" fill="#5eead4" />
        <circle cx="55" cy="82" r="2" fill="#5eead4" />
        <circle cx="52" cy="62" r="2.5" fill="#5eead4" opacity="0.8" />
      </svg>
    );
  }

  if (s.includes('math') || k.includes('equation') || k.includes('algebra') || k.includes('theorem') || k.includes('calculus')) {
    return (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)] shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 85 L85 85 M15 15 L15 85" strokeLinecap="round" />
        <path d="M15 85 L75 35" strokeDasharray="3 3" />
        <path d="M15 65 Q45 65 75 25" stroke="#fcd34d" strokeWidth="3" fill="none" />
        <circle cx="75" cy="25" r="4" fill="#fbbf24" />
        <text x="35" y="45" fill="#fde68a" fontSize="16" fontFamily="serif" fontStyle="italic">f(x)</text>
      </svg>
    );
  }

  if (s.includes('econ') || k.includes('market') || k.includes('price') || k.includes('profit') || k.includes('trade')) {
    return (
      <svg className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="20" y="55" width="12" height="30" rx="3" fill="rgba(52,211,153,0.3)" stroke="currentColor" strokeWidth="2" />
        <rect x="40" y="40" width="12" height="45" rx="3" fill="rgba(52,211,153,0.4)" stroke="currentColor" strokeWidth="2" />
        <rect x="60" y="25" width="12" height="60" rx="3" fill="rgba(52,211,153,0.6)" stroke="currentColor" strokeWidth="2" />
        <path d="M18 60 L38 45 L58 28 L82 15" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
        <polygon points="82,15 74,18 78,24" fill="#34d399" />
      </svg>
    );
  }

  return (
    <svg className="w-16 h-16 sm:w-20 sm:h-20 text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)] shrink-0" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M50 28 C40 22 24 22 15 25 L15 75 C24 72 40 72 50 78 C60 72 76 72 85 75 L85 25 C76 22 60 22 50 28 Z" fill="rgba(16,185,129,0.2)" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 28 L50 78" strokeWidth="2" />
      <path d="M50 14 L50 8 M46 11 L54 11" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="11" r="3" fill="#fbbf24" />
    </svg>
  );
}

export default function VisualAssistPanel({
  visual,
  visualMode,
  setVisualMode,
  embedded,
  onUploadClick,
  onFileDrop,
  activeDemoTopic,
  isDemoActive,
  isCuratedDemo = false
}: VisualAssistPanelProps) {
  // Normalize topic key ONLY when playing one of the curated Quick Demos
  const matchedTopicKey = React.useMemo(() => {
    if (!isCuratedDemo) return null; // Never use hardcoded demo slides for Prompt to Sign
    if (!activeDemoTopic && !visual.url && !visual.keyword) return null;
    const str = `${activeDemoTopic || ''} ${visual.url || ''} ${visual.keyword || ''}`.toLowerCase();
    if (str.includes('photo') || str.includes('plant')) return 'photosynthesis';
    if (str.includes('ohm') || str.includes('circuit') || str.includes('volt')) return 'ohms_law';
    if (str.includes('crow') || str.includes('thirsty') || str.includes('pitcher')) return 'thirsty_crow';
    if (str.includes('profit') || str.includes('loss') || str.includes('retail')) return 'profit_and_loss';
    if (str.includes('supply') || str.includes('demand') || str.includes('market')) return 'supply_and_demand';
    if (str.includes('indus') || str.includes('harappa') || str.includes('mohenjo')) return 'indus_valley';
    return null;
  }, [isCuratedDemo, activeDemoTopic, visual.url, visual.keyword]);

  const activeTopicData: DemoTopicSlides | null = matchedTopicKey ? DEMO_TOPICS_REGISTRY[matchedTopicKey] : null;

  // Track slide index
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Compute best active image URL with instant fallback so the TV is NEVER left blank
  const defaultTopicSlide = isCuratedDemo ? (activeTopicData?.slides?.[0]?.imagePath || null) : null;
  const initialSlideUrl = isCuratedDemo ? (visual.url || defaultTopicSlide || null) : (visual.url || null);

  const [activeUrl, setActiveUrl] = useState<string | null>(initialSlideUrl);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize incoming visual.url or demo activation without ever blanking the TV
  useEffect(() => {
    if (!isCuratedDemo) {
      setActiveUrl(visual.url || null);
      return;
    }

    const candidate = visual.url || defaultTopicSlide || null;
    if (!candidate) {
      setActiveUrl(null);
      return;
    }

    // If candidate matches slide_(\d+).svg, sync slide index
    const match = candidate.match(/slide_(\d+)\.svg/i);
    if (match && activeTopicData) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < activeTopicData.slides.length) {
        setCurrentSlideIndex(idx);
      }
    }

    if (candidate !== activeUrl) {
      if (typeof window !== 'undefined') {
        const img = new Image();
        img.src = candidate;
        img.onload = () => {
          setActiveUrl(candidate);
          setIsFlipping(true);
          setTimeout(() => setIsFlipping(false), 500);
        };
        img.onerror = () => {
          if (defaultTopicSlide && candidate !== defaultTopicSlide) {
            setActiveUrl(defaultTopicSlide);
          }
        };
      } else {
        setActiveUrl(candidate);
      }
    }
  }, [visual.url, isCuratedDemo, defaultTopicSlide, activeTopicData, activeUrl]);

  // When demo topic changes or new prompt begins, reset slide index
  useEffect(() => {
    setCurrentSlideIndex(0);
    if (isCuratedDemo && defaultTopicSlide) {
      setActiveUrl(defaultTopicSlide);
    } else {
      setActiveUrl(visual.url || null);
    }
  }, [matchedTopicKey, defaultTopicSlide, isCuratedDemo, activeDemoTopic]);

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
  const effectiveImageUrl = activeUrl || (isCuratedDemo && defaultTopicSlide) || null;
  const isVerifiedSvg = Boolean(
    isCuratedDemo &&
    effectiveImageUrl && (
      effectiveImageUrl.startsWith('/demo_images/') || 
      effectiveImageUrl.endsWith('.svg') || 
      activeTopicData !== null
    )
  );

  // Detect subject domain to give proper educational iconography & styling
  const detectedSubject = React.useMemo(() => {
    const textToScan = `${activeDemoTopic || ''} ${visual.keyword || ''} ${visual.text || ''}`.toLowerCase();
    if (/\b(math|maths|mathematics|algebra|calculus|geometry|quadratic|equation|pythagoras|matrix|differentiation|integration|theorem|solve|variable|fraction|integer|triangle|polynomial)\b/.test(textToScan)) {
      return { name: "Mathematics", icon: "📐", color: "from-amber-300 via-yellow-200 to-amber-400" };
    }
    if (/\b(physics|gravity|motion|velocity|acceleration|newton|ohm|force|voltage|current|circuit|electricity|optics|light|wave|photon|thermodynamics|quantum)\b/.test(textToScan)) {
      return { name: "Physics", icon: "⚡", color: "from-cyan-300 via-teal-200 to-sky-300" };
    }
    if (/\b(chemistry|molecule|atom|reaction|compound|acid|base|periodic|element|bond|electron|solvent)\b/.test(textToScan) && !/\b(math|solve|equation|algebra)\b/.test(textToScan)) {
      return { name: "Chemistry", icon: "🧪", color: "from-emerald-300 via-teal-200 to-cyan-300" };
    }
    if (/\b(biology|cell|photosynthesis|plant|chloroplast|animal|dna|rna|genetics|heart|organ|organism|ecosystem|species)\b/.test(textToScan)) {
      return { name: "Biology", icon: "🌿", color: "from-emerald-300 via-green-200 to-teal-300" };
    }
    if (/\b(economics|market|supply|demand|price|cost|profit|loss|gdp|inflation|trade|retail)\b/.test(textToScan)) {
      return { name: "Economics", icon: "📈", color: "from-emerald-300 via-teal-200 to-sky-300" };
    }
    if (/\b(history|indus|valley|civilization|harappa|ancient|empire|dynasty|war|archaeology)\b/.test(textToScan)) {
      return { name: "History", icon: "🏛️", color: "from-amber-300 via-orange-200 to-amber-400" };
    }
    return { name: activeDemoTopic || "Educational Lecture", icon: "📚", color: "from-emerald-300 via-teal-200 to-cyan-300" };
  }, [activeDemoTopic, visual.keyword, visual.text]);

  // Extract any mathematical/scientific formula present in the spoken explanation
  const extractedFormula = React.useMemo(() => {
    if (!visual.text) return null;
    const match = visual.text.match(/([a-zA-Z0-9\s+\-*\/=^()_θπ²³°±≤≥√]+=[a-zA-Z0-9\s+\-*\/=^()_θπ²³°±≤≥√]+)/);
    if (match && match[0].trim().length >= 3 && match[0].trim().length <= 45) {
      return match[0].trim();
    }
    return null;
  }, [visual.text]);

  const hasExplanationSlide = Boolean(
    !isVerifiedSvg && ((visual.text && visual.text.trim().length > 0) || activeDemoTopic || visual.url)
  );

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
        {activeTopicData && isCuratedDemo ? (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-lg">
            <span className="text-sm">{activeTopicData.icon}</span>
            <span className="text-emerald-300 text-xs sm:text-sm font-bold tracking-wide">
              {activeTopicData.topicTitle}
            </span>
          </div>
        ) : activeDemoTopic ? (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-lg">
            <span className="text-sm">{detectedSubject.icon}</span>
            <span className="text-emerald-300 text-xs sm:text-sm font-bold tracking-wide">
              {activeDemoTopic}
            </span>
          </div>
        ) : visual.keyword ? (
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-500/30 shadow-lg">
            <span className="text-sm">{detectedSubject.icon}</span>
            <span className="text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
              {visual.keyword}
            </span>
          </div>
        ) : null}
      </div>

      {/* 1. Verified Local SVG Diagram (Curated Quick Demos: Photosynthesis, Ohm's Law, etc.) */}
      {isVerifiedSvg && effectiveImageUrl ? (
        <div className="absolute inset-0 p-2 sm:p-4 pt-8 sm:pt-10 pb-4 flex items-center justify-center [perspective:1400px]">
          <div className={`w-full h-full relative flex items-center justify-center transition-transform duration-500 ${isFlipping ? 'scale-[0.98]' : 'scale-100'}`}>
            <img
              src={effectiveImageUrl}
              alt={currentSlide?.title || visual.keyword || 'Chalkboard Slide'}
              className="w-full h-full object-contain rounded-xl drop-shadow-2xl transition-opacity duration-300"
              onError={() => {
                if (defaultTopicSlide && effectiveImageUrl !== defaultTopicSlide) {
                  setActiveUrl(defaultTopicSlide);
                }
              }}
            />
            <div className="absolute inset-0 pointer-events-none rounded-xl border border-emerald-400/20 shadow-[inset_0_0_24px_rgba(52,211,153,0.12)]" />
          </div>
        </div>
      ) : hasExplanationSlide ? (
        /* 2. Dynamic Chalkboard Presentation PPT Slide — Tailored to what Luna is speaking with little images */
        <div className="absolute inset-0 p-3 sm:p-6 pt-12 sm:pt-14 pb-4 flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-[95%] bg-black/60 backdrop-blur-xl border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 relative ring-1 ring-white/10">
            
            {/* Top Slide Header: Subject + Topic Badge + Live Speaker Badge */}
            <div className="flex items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/90 border border-emerald-400/50 text-[10px] sm:text-xs font-bold text-emerald-300 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>{detectedSubject.icon}</span>
                  <span>{detectedSubject.name}</span>
                </span>
                {activeDemoTopic && (
                  <span className="text-xs sm:text-sm font-bold text-white/90 truncate max-w-[200px] sm:max-w-xs font-mono">
                    {activeDemoTopic}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Speaking & Signing</span>
              </div>
            </div>

            {/* Slide Body: Little Image / Educational Illustration + Clear Presentation Points */}
            <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 py-1">
              
              {/* Visual Card: External image or Thematic Educational Vector Illustration */}
              {visual.url && (visual.url.startsWith('http') || visual.url.startsWith('/')) ? (
                <div className="w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-400/40 shadow-xl bg-black/40 flex items-center justify-center relative">
                  <img
                    src={visual.url}
                    alt={visual.keyword || 'Illustration'}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-black/80 border border-emerald-500/30 shadow-xl flex items-center justify-center p-2">
                  <EducationalIllustration subject={detectedSubject.name} keyword={visual.keyword || activeDemoTopic} />
                </div>
              )}

              {/* Presentation Text: Formatted what she is speaking */}
              <div className="flex-1 flex flex-col gap-2.5 text-left min-w-0">
                
                {/* Active Concept Title */}
                {visual.keyword && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-300 tracking-wide uppercase font-mono">
                    <span>✦</span>
                    <span>{visual.keyword}</span>
                  </div>
                )}

                {/* Formula Callout if any equation is present */}
                {extractedFormula && (
                  <div className="self-start px-3.5 py-1.5 rounded-xl bg-amber-950/80 border border-amber-400/60 shadow-lg shadow-amber-950/40">
                    <span className="text-base sm:text-xl font-mono font-bold text-amber-200 tracking-wider">
                      {extractedFormula}
                    </span>
                  </div>
                )}

                {/* Primary Spoken Explanation */}
                <p className="text-base sm:text-xl md:text-2xl font-semibold leading-relaxed text-white drop-shadow-md font-sans">
                  {visual.text || "Preparing lecture..."}
                </p>
              </div>
            </div>

            {/* Slide Footer: Educational Chalkboard Takeaway */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs text-emerald-400/80 pt-1 border-t border-emerald-500/10 font-medium">
              <span>Interactive Classroom Demonstration</span>
              <span>Signova AI Lecture Series</span>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Classroom Chalkboard Empty Slate: Classic SIGNOVA Typography */
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
