"use client";

import { useRef, useState, useCallback, useEffect } from 'react';
import { cleanVoiceSubtitles } from '../lib/subtitleUtils';

export interface PlayChunk {
  /** The ENGLISH mini-chunk text — this is what the sign gloss (sigml) was
   *  built from, and it's what the backend keeps fixed regardless of target
   *  language. NOT what should be shown as the caption when a non-English
   *  language is selected — see translated_text below. */
  text?: string;
  /** Present only when the target language isn't English — the actual
   *  Hindi/Marathi/Malayalam/Telugu text the audio is speaking. This is what
   *  captions should show whenever it's available; see playNextInQueue. */
  translated_text?: string;
  sigml: string[];
  visual_url?: string;
  visual_keyword?: string;
  visual_source?: string;
  audio_base64?: string;
  concept?: string;
}

export const RESTING_POSITION_SIGML = `<sigml>
<hns_sign gloss="resting position">
\t<hamnosys_nonmanual>
\t</hamnosys_nonmanual>
\t<hamnosys_manual>
\t\t<hamsymmlr/>
\t\t<hamflathand/>
\t\t<hamthumbacrossmod/>
\t\t<hamfingerbendmod/>
\t\t<hamextfingerd/>
\t\t<hampalml/>
\t\t<hambelowstomach/>
\t\t<hamlrat/>
\t\t<hamclose/>
\t</hamnosys_manual>
</hns_sign>
</sigml>`;

export function useCWASA(
  setSubtitles?: (text: string, isFinal?: boolean) => void,
  onChunkStart?: (chunk: PlayChunk) => void,
  onQueueFinish?: () => void
) {
  const queue = useRef<PlayChunk[]>([]);
  const history = useRef<PlayChunk[]>([]);
  
  const isPlaying = useRef(false);
  const isPaused = useRef(false);
  
  const [playerState, setPlayerState] = useState({
    paused: false,
    hasQueue: false,
    hasHistory: false,
    playing: false
  });

  const unlockTimer = useRef<NodeJS.Timeout | null>(null);
  const restTimer = useRef<NodeJS.Timeout | null>(null);
  const signIsActiveRef = useRef<boolean>(false);
  const onSignIdleCallback = useRef<(() => void) | null>(null);

  // Listen to native CWASA 'animidle' hook so we know precisely when gesture execution finishes
  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    const registerHook = () => {
      if (typeof window !== 'undefined' && window.CWASA?.addHook) {
        window.CWASA.addHook('animidle', () => {
          if (signIsActiveRef.current) {
            signIsActiveRef.current = false;
            if (onSignIdleCallback.current) {
              const cb = onSignIdleCallback.current;
              onSignIdleCallback.current = null;
              cb();
            }
          }
        });
        window.CWASA.addHook('sigmlloaded', (evt: any) => {
          // If CWASA reported abandoned or failed loading (evt.msg == null)
          if (!evt || evt.msg == null) {
            if (signIsActiveRef.current && onSignIdleCallback.current) {
              const cb = onSignIdleCallback.current;
              signIsActiveRef.current = false;
              onSignIdleCallback.current = null;
              cb();
            }
          }
        });
        return true;
      }
      return false;
    };

    if (!registerHook()) {
      checkInterval = setInterval(() => {
        if (registerHook() && checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
      }, 400);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const returnToRestPose = useCallback(() => {
    if (restTimer.current) {
      clearTimeout(restTimer.current);
      restTimer.current = null;
    }
    signIsActiveRef.current = false;
    onSignIdleCallback.current = null;
    if (typeof window !== 'undefined' && window.CWASA && window.CWASA.playSiGMLText) {
      try {
        window.CWASA.playSiGMLText(RESTING_POSITION_SIGML);
      } catch (e) {
        console.warn("[CWASA] Could not return to resting pose:", e);
      }
    }
  }, []);

  // Persistent <audio> elements for ping-pong buffering
  const audioSlots = useRef<[HTMLAudioElement | null, HTMLAudioElement | null]>([null, null]);
  const activeSlotIndex = useRef<0 | 1>(0);
  const pendingSlotIndex = useRef<0 | 1>(0);

  if (typeof window !== 'undefined' && !audioSlots.current[0]) {
    audioSlots.current[0] = new Audio();
    audioSlots.current[1] = new Audio();
  }

  // Pre-unlock browser audio autoplay restrictions on user gesture
  const unlockAudio = useCallback(() => {
    if (typeof window === 'undefined') return;
    audioSlots.current.forEach(audio => {
      if (audio) {
        audio.muted = true;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            audio.pause();
            audio.muted = false;
          }).catch(() => {
            audio.muted = false;
          });
        }
      }
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleGesture = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleGesture, { once: true });
    window.addEventListener('touchstart', handleGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [unlockAudio]);

  const getActiveAudio = () => audioSlots.current[activeSlotIndex.current];

  const updatePlayerState = useCallback(() => {
    setPlayerState({
      paused: isPaused.current,
      hasQueue: queue.current.length > 0,
      hasHistory: history.current.length > 0,
      playing: isPlaying.current
    });
  }, []);

  const calculateChunkDuration = (chunk: PlayChunk) => {
    let signCount = 0;
    for (const sigmlString of chunk.sigml) {
      const innerContent = sigmlString.replace(/<\/?sigml>/gi, "").trim();
      signCount += (innerContent.match(/<hns_sign/g) || []).length;
    }
    // Realistic duration: average HamNoSys sign in CWASA takes ~1200ms - 1500ms
    return Math.max(signCount * 1300, 1500);
  };

  const playNextInQueue = () => {
    if (isPaused.current) {
      isPlaying.current = false;
      updatePlayerState();
      return;
    }
    
    if (queue.current.length === 0) {
      isPlaying.current = false;
      updatePlayerState();
      
      // Notify caller that queue has finished
      if (onQueueFinish) {
        onQueueFinish();
      }

      // Auto-return avatar to resting position with 2.5s graceful pause window
      // so hands don't freeze or drop abruptly between spoken phrases
      if (restTimer.current) clearTimeout(restTimer.current);
      restTimer.current = setTimeout(() => {
        if (!isPlaying.current && queue.current.length === 0) {
          returnToRestPose();
          if (setSubtitles) setSubtitles("");
        }
      }, 2500);
      return;
    }

    if (window.CWASA && window.CWASA.playSiGMLText && !window.__cwasaAvatarReady) {
      setTimeout(playNextInQueue, 250);
      return;
    }

    isPlaying.current = true;
    updatePlayerState();
    
    const chunk = queue.current.shift();
    if (!chunk) return;

    activeSlotIndex.current = pendingSlotIndex.current;

    if (onChunkStart) onChunkStart(chunk);
    history.current.push(chunk);

    const rawCaption = chunk.translated_text || chunk.text;
    const captionText = cleanVoiceSubtitles(rawCaption);
    if (captionText && setSubtitles) {
      setSubtitles(captionText, false);
    }

    let combinedSigml = "<sigml>\n";
    let signCount = 0;
    if (chunk.sigml && Array.isArray(chunk.sigml)) {
      for (const sigmlString of chunk.sigml) {
        if (!sigmlString) continue;
        const innerContent = sigmlString.replace(/<\/?sigml>/gi, "").trim();
        if (innerContent) {
          combinedSigml += innerContent + "\n";
          signCount += (innerContent.match(/<hns_sign/g) || []).length;
        }
      }
    }
    combinedSigml += "</sigml>";

    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    if (restTimer.current) {
      clearTimeout(restTimer.current);
      restTimer.current = null;
    }

    // Realistic sign duration: CWASA average sign is ~1200ms - 1500ms
    const estimatedSignDuration = Math.max(signCount * 1300 + 400, 1600);

    let hasAdvanced = false;
    const advance = () => {
      if (hasAdvanced) return;
      hasAdvanced = true;
      signIsActiveRef.current = false;
      onSignIdleCallback.current = null;
      if (unlockTimer.current) {
        clearTimeout(unlockTimer.current);
        unlockTimer.current = null;
      }
      if (captionText && setSubtitles) {
        setSubtitles(captionText, true);
      }
      playNextInQueue();
    };

    const hasSigns = signCount > 0 && typeof window !== 'undefined' && !!(window.CWASA && window.CWASA.playSiGMLText);
    const activeAudio = getActiveAudio();
    const hasAudio = !!(chunk.audio_base64 && activeAudio);

    let audioDone = !hasAudio;
    let signDone = !hasSigns;

    const checkComplete = () => {
      if (audioDone && signDone) {
        advance();
      }
    };

    // Guard against empty SiGML: Only call playSiGMLText if signCount > 0
    if (hasSigns) {
      signIsActiveRef.current = true;
      onSignIdleCallback.current = () => {
        signDone = true;
        checkComplete();
      };
      try {
        window.CWASA.playSiGMLText(combinedSigml);
      } catch (e) {
        console.warn("[CWASA] Error executing playSiGMLText:", e);
        signDone = true;
        checkComplete();
      }
    } else {
      signDone = true;
    }

    if (hasAudio && activeAudio) {
      if (activeAudio.src !== chunk.audio_base64) {
        activeAudio.src = chunk.audio_base64!;
      }
      activeAudio.onended = null;
      activeAudio.onended = () => {
        audioDone = true;
        checkComplete();
        // Grace period: If speech audio ended but sign animation idle hasn't fired after 750ms,
        // force sign completion so the avatar NEVER gets stuck or lags!
        if (!signDone) {
          setTimeout(() => {
            if (!signDone) {
              signDone = true;
              checkComplete();
            }
          }, 750);
        }
      };
      activeAudio.play().catch(e => {
        console.warn("[Audio] Playback prevented or failed:", e);
        audioDone = true;
        checkComplete();
      });
    } else {
      audioDone = true;
    }

    // Adaptive safety net: never stall for 8000ms! Average sign is ~1.3s
    const maxSafetyMs = Math.min(Math.max(estimatedSignDuration + 500, 1800), 4500);
    unlockTimer.current = setTimeout(() => {
      advance();
    }, maxSafetyMs);

    // Initial check in case chunk was completely empty
    checkComplete();

    // Standby slot preloading
    const standbyIndex: 0 | 1 = activeSlotIndex.current === 0 ? 1 : 0;
    const standbyAudio = audioSlots.current[standbyIndex];
    const upNext = queue.current[0];
    if (upNext?.audio_base64 && standbyAudio) {
      standbyAudio.src = upNext.audio_base64;
      standbyAudio.load();
    }
    pendingSlotIndex.current = standbyIndex;
  };

  const enqueueChunks = (chunks: PlayChunk[], options?: { replace?: boolean }) => {
    if (!chunks || chunks.length === 0) return;
    if (restTimer.current) clearTimeout(restTimer.current);

    if (options?.replace) {
      // Take over immediately instead of queuing behind whatever's already
      // playing — this is what "click a new demo" needs: without this, the
      // new content just got appended to the end of the current queue, so it
      // silently waited its turn behind everything already playing, which
      // read as "nothing happened" until the current queue finally drained
      // (or the page was refreshed to force a reset).
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
      // Only actually stop CWASA if something is genuinely mid-playback right
      // now. This used to call stopSiGML() unconditionally, including on the
      // very FIRST demo click of a fresh session — before playSiGMLText has
      // ever been called even once. Stopping something that was never
      // started appears to leave CWASA in a broken state (the avatar then
      // renders as empty/blank), and the try/catch here was silently
      // swallowing whatever error that produced, so it never showed up in
      // the console. pause()/skipForward()/skipBackward() below call
      // stopSiGML() unconditionally too, but those are only reachable from
      // PlayerControls, which never renders until something has already
      // played at least once — so they never hit this same fresh-instance case.
      if (isPlaying.current && window.CWASA && window.CWASA.stopSiGML) {
        try { window.CWASA.stopSiGML(); } catch (e) {}
      }
      const activeAudio = getActiveAudio();
      if (activeAudio) {
        activeAudio.onended = null;
        activeAudio.pause();
      }
      queue.current = [];
      history.current = [];
      isPlaying.current = false;
      isPaused.current = false;
    }

    // Filter out duplicate consecutive chunks
    const filteredChunks = chunks.filter(c => {
      const last = queue.current[queue.current.length - 1] || history.current[history.current.length - 1];
      if (last && c.text && last.text) {
        if (c.text.trim().toLowerCase() === last.text.trim().toLowerCase()) {
          return false;
        }
      }
      return true;
    });

    if (filteredChunks.length === 0) return;

    queue.current.push(...filteredChunks);
    updatePlayerState();
    if (!isPlaying.current && !isPaused.current) {
      playNextInQueue();
    }
  };

  const enqueueSiGML = (sigmlArray: string[], text?: string) => {
    if (!sigmlArray || sigmlArray.length === 0) return;
    enqueueChunks([{ sigml: sigmlArray, text: text || undefined }]);
  };
  
  const pause = () => {
    isPaused.current = true;
    signIsActiveRef.current = false;
    onSignIdleCallback.current = null;
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    if (window.CWASA && window.CWASA.stopSiGML) {
      try { window.CWASA.stopSiGML(); } catch(e) {}
    }
    const activeAudio = getActiveAudio();
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.pause();
    }
    isPlaying.current = false;
    updatePlayerState();
  };

  const resume = () => {
    isPaused.current = false;
    if (!isPlaying.current) {
      // If we paused in the middle of a chunk, we restart the last chunk
      if (history.current.length > 0) {
          queue.current.unshift(history.current.pop()!);
      }
      playNextInQueue();
    }
    updatePlayerState();
  };
  
  const skipForward = (seconds = 20) => {
    const targetMs = seconds * 1000;
    let accumulatedMs = 0;
    
    // Stop current execution
    signIsActiveRef.current = false;
    onSignIdleCallback.current = null;
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    if (window.CWASA && window.CWASA.stopSiGML) {
      try { window.CWASA.stopSiGML(); } catch(e) {}
    }
    const skipActiveAudio = getActiveAudio();
    if (skipActiveAudio) {
      skipActiveAudio.onended = null;
      skipActiveAudio.pause();
      skipActiveAudio.currentTime = 0;
    }
    
    // Move chunks from queue to history until target time is reached
    while (queue.current.length > 0 && accumulatedMs < targetMs) {
      const nextChunk = queue.current.shift()!;
      history.current.push(nextChunk);
      accumulatedMs += calculateChunkDuration(nextChunk);
    }
    
    if (!isPaused.current) {
      playNextInQueue();
    } else {
      updatePlayerState();
    }
  };
  
  const skipBackward = (seconds = 20) => {
    const targetMs = seconds * 1000;
    let accumulatedMs = 0;
    
    // Stop current execution
    signIsActiveRef.current = false;
    onSignIdleCallback.current = null;
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    if (window.CWASA && window.CWASA.stopSiGML) {
      try { window.CWASA.stopSiGML(); } catch(e) {}
    }
    const skipActiveAudio = getActiveAudio();
    if (skipActiveAudio) {
      skipActiveAudio.onended = null;
      skipActiveAudio.pause();
      skipActiveAudio.currentTime = 0;
    }
    
    // The current playing chunk was already put in history when started, so we move it back
    if (history.current.length > 0) {
      queue.current.unshift(history.current.pop()!);
    }
    
    // Now move more chunks from history to queue to satisfy the 20 seconds
    while (history.current.length > 0 && accumulatedMs < targetMs) {
      const prevChunk = history.current.pop()!;
      queue.current.unshift(prevChunk);
      accumulatedMs += calculateChunkDuration(prevChunk);
    }
    
    if (!isPaused.current) {
      playNextInQueue();
    } else {
      updatePlayerState();
    }
  };

  const stopAll = useCallback(() => {
    signIsActiveRef.current = false;
    onSignIdleCallback.current = null;
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    if (restTimer.current) {
      clearTimeout(restTimer.current);
      restTimer.current = null;
    }
    queue.current = [];
    history.current = [];
    isPlaying.current = false;
    isPaused.current = false;
    const activeAudio = getActiveAudio();
    if (activeAudio) {
      activeAudio.onended = null;
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    if (window.CWASA && window.CWASA.stopSiGML) {
      try { window.CWASA.stopSiGML(); } catch (e) {}
    }
    returnToRestPose();
    updatePlayerState();
    if (setSubtitles) setSubtitles("");
  }, [returnToRestPose, updatePlayerState, setSubtitles]);

  return { enqueueSiGML, enqueueChunks, pause, resume, skipForward, skipBackward, playerState, returnToRestPose, stopAll, unlockAudio };
}
