"use client";

import { useState, useCallback } from 'react';
import type { PlayChunk } from './useCWASA';

export interface VisualState {
  url: string | null;
  keyword: string | null;
  source: string | null;
}

// 'visual'    — full-bleed visual content behind a PiP avatar (existing layout)
// 'classroom' — avatar shifted to the side next to a framed "smartboard"
//               showing the visual content, for a virtual-classroom feel
// 'focus'     — avatar full screen, no visual content shown
export type VisualMode = 'visual' | 'classroom' | 'focus';

export function useVisualAssist() {
  const [visual, setVisual] = useState<VisualState>({ url: null, keyword: null, source: null });
  // Default changed to 'classroom': that's the finished, presentable layout
  // (smartboard + avatar side by side) the app should open showing, not an
  // implementation detail — no localStorage persistence for this exists, so
  // this default applies on every fresh load.
  const [visualMode, setVisualMode] = useState<VisualMode>('classroom');

  /** Called by useCWASA each time a new chunk starts playing */
  const onChunkStart = useCallback((chunk: PlayChunk) => {
    if (chunk.visual_url) {
      setVisual({
        url: chunk.visual_url,
        keyword: chunk.visual_keyword ?? null,
        source: chunk.visual_source ?? null,
      });
    }
  }, []);

  const clearVisual = useCallback(() => {
    setVisual({ url: null, keyword: null, source: null });
  }, []);

  return {
    visual,
    visualMode,
    setVisualMode,
    onChunkStart,
    clearVisual,
  };
}
