"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import SignAvatar from "../../components/SignAvatar";
import TeacherHeader from "../../components/TeacherHeader";
import ControlBar from "../../components/ControlBar";
import OnboardingTour from "../../components/OnboardingTour";
import SettingsPanel from "../../components/SettingsPanel";
import VisualizerBackground from "../../components/VisualizerBackground";
import SubtitlesOverlay from "../../components/SubtitlesOverlay";
import AIToolsModal from "../../components/AIToolsModal";
import PlayerControls from "../../components/PlayerControls";
import VisualAssistPanel from "../../components/VisualAssistPanel";
import SmartWhiteboard from "../../components/SmartWhiteboard";
import MobileInteractiveDock from "../../components/MobileInteractiveDock";
import { useCWASA, PlayChunk } from "../../hooks/useCWASA";
import { useSignSockets } from "../../hooks/useSignSockets";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useVisualAssist } from "../../hooks/useVisualAssist";
import { useCastAudioToSign } from "../../hooks/useCastAudioToSign";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { Rnd } from 'react-rnd';
import { getAvatarGender, getVoiceForLanguage } from "../../lib/voiceGender";
import { playCompletionChime } from "../../lib/soundEffects";
import { cleanVoiceSubtitles, formatProperSubtitles } from "../../lib/subtitleUtils";
import SignCameraDetector from "../../components/SignCameraDetector";
import { textToSiGML } from "../../lib/clientSignConverter";

export default function Home() {
  // --- UI STATE ---
  const [isScreenshare, setIsScreenshare] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isSignCameraOpen, setIsSignCameraOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        console.error(`Error attempting to disable full-screen mode: ${err.message}`);
      });
    }
  }, []);

  const [isPdfAnnotate, setIsPdfAnnotate] = useState(false);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);
  const controlBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isTopBarVisible, setIsTopBarVisible] = useState(true);
  const topBarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [subtitles, setSubtitles] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [showAvatarBg, setShowAvatarBg] = useState(false);
  // Multiplier (1-4) applied on top of the PiP box's natural zoom, so the
  // avatar can be made noticeably bigger without resizing the box itself.
  // Default bumped from 1 to 2.5 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  the avatar was reported too small to
  // present with by default. This grows the SAME box+scale mechanism the
  // Character Size Settings buttons already use (Rnd box size AND the
  // avatar's internal render scale move together), not just an invisible
  // frame around an unchanged-size avatar ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  see SignAvatar.tsx.
  // REVERTED 5 -> 2.5: characterScale sizes the outer DRAGGABLE box itself
  // (rndBox.size * characterScale), not just how zoomed the avatar looks.
  // At 5x that box was 1900x2400px ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  bigger than almost any real browser
  // window. The window can only show a small window into a box that size,
  // landing wherever it happens to overlap (confirmed live: an extreme
  // close-up on her face/neck, not a deliberate crop). 2.5x (950x1200) is
  // the size actually confirmed working with a real head-to-waist result.
  // Further "bigger" should go through CROP_ZOOM in SignAvatar.tsx instead ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 
  // that zooms the content within a box that stays this same safe size,
  // rather than growing the box itself past what a screen can show.
  const [characterScale, setCharacterScale] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("static_character_scale_v5");
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 1) return val;
      }
    }
    return 2.5;
  });
  // Display-only movie subtitles: merge caption fragments into the full current
  // sentence. Default true for smooth movie-like captions.
  const [fullSentenceCaptions, setFullSentenceCaptions] = useState(true);
  // Opt-in richer classroom visuals (bezel, lighting, ground shadow).
  // Default off ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  current look unchanged unless the user turns this on.
  const [classroomAmbience, setClassroomAmbience] = useState(false);

  // --- TTS & TRANSLATION STATE ---
  const [targetLanguage, setTargetLanguage] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selected_classroom_language") || "English";
    }
    return "English";
  });
  const [targetVoice, setTargetVoice] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("static_target_voice_v2");
      if (saved) return saved;
    }
    return getVoiceForLanguage("English", "female") || "en-US-AriaNeural";
  });
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // --- VISUAL ASSIST STATE ---
  // Default true: the classroom-with-visuals layout is the finished,
  // presentable state the app should open in. The existing localStorage
  // read below only ever forces this to true (never back to false), so
  // this default can't get silently overridden the way earlier defaults did.
  const [isVisualAssistEnabled, setIsVisualAssistEnabled] = useState(true);
  const { visual, visualMode, setVisualMode, onChunkStart, clearVisual } = useVisualAssist();
  
  // --- MEDIA STATE ---

    // --- MEDIA STATE ---
  const [presentationFileUrl, setPresentationFileUrl] = useState<string | null>(null);
  const [presentationFileType, setPresentationFileType] = useState<"video" | "image" | "pdf" | null>(null);

  // --- SESSION SETTINGS ---
  const [teacherName, setTeacherName] = useState("Prof. Alan");
  const [topic, setTopic] = useState("Quantum Computing Basics");
  const [avatarName, setAvatarName] = useState("luna");
  
  // --- TRANSCRIPT HISTORY ---
  const [transcriptHistory, setTranscriptHistory] = useState<{ time: string, text: string }[]>([]);

  // --- REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const presentationVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsTeacherRef = useRef<WebSocket | null>(null);

  // --- AVATAR PiP BOX (remembered across PiP<->fullscreen toggles) ---
  const [rndBox, setRndBox] = useState({
    position: { x: 950, y: 40 },
    // Must match SignAvatar's PIP_BASE_WIDTH/HEIGHT — see the comment there
    // for why this exact aspect ratio matters (CWASA fits the whole avatar
    // to this box's aspect, so it controls what's visible, not just size).
    size: { width: 480, height: 480 }
  });

  // --- AI TOOLS PROCESSING STATUS (visible even after the modal auto-closes) ---
  const [aiProcessingStatus, setAiProcessingStatus] = useState<string | null>(null);

  // Wrap setSubtitles to also append to transcript history when it's a final subtitle.
  // NOTE: this used to also play mic-final TTS audio directly via its own
  // standalone <audio> element (the 3rd `audioB64` argument) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â completely
  // standalone <audio> element (the 3rd `audioB64` argument) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  completely
  // independent of sign playback timing. That's been removed: mic-final
  // audio now flows through useCWASA's queue instead (see useSignSockets.ts),
  // the same audio-driven sync path AI Tools chunks already used, so signs
  // and speech share one clock instead of racing on two unrelated ones.
  const handleSetSubtitles = (text: string, isFinal?: boolean) => {
    const cleaned = formatProperSubtitles(text, isFinal);
    setSubtitles(cleaned);
    if (isFinal && cleaned.trim()) {
      setTranscriptHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text.trim().toLowerCase() === cleaned.trim().toLowerCase()) {
          return prev;
        }
        return [...prev, { time: new Date().toLocaleTimeString(), text: cleaned.trim() }];
      });
    }
  };


  // Full-Sentence Captions (opt-in toggle): useCWASA's chunk playback shows
  // one 5-word sign-timing fragment at a time as its own caption — accurate
  // for timing, but reads as a raw mid-sentence chunk ("called chlorophyll,
  // which mix water"). This wrapper is used ONLY for chunk-based captions
  // (useCWASA), not the live mic partial-text path (useSignSockets below,
  // which already shows a complete growing sentence-so-far and doesn't need
  // this). It merges fragments into the sentence they belong to, purely for
  // DISPLAY — sign/audio timing is untouched, each fragment still drives
  // playback exactly as before, this only changes what text is shown.
  const sentenceBufferRef = useRef<string[]>([]);
  const isRecordingRef = useRef(false);
  const handleChunkSubtitles = (text: string, isFinal?: boolean) => {
    if (isRecordingRef.current) return;
    const cleaned = formatProperSubtitles(text, isFinal);
    if (!cleaned) {
      setSubtitles("");
      sentenceBufferRef.current = [];
      return;
    }
    if (!fullSentenceCaptions) {
      handleSetSubtitles(cleaned, isFinal);
      return;
    }
    // Append once per chunk — on the chunk-start (isFinal=false) call only;
    // useCWASA calls again with isFinal=true for the same chunk's text when
    // it finishes, which should just redisplay the buffer, not double-add it.
    if (!isFinal) {
      const buf = sentenceBufferRef.current;
      // Previous sentence already ended (fragment ended in . ! or ?) — start fresh.
      if (buf.length > 0 && /[.!?।]\s*$/.test(buf[buf.length - 1])) {
        sentenceBufferRef.current = [];
      }
      sentenceBufferRef.current = [...sentenceBufferRef.current, cleaned];
    }
    setSubtitles(sentenceBufferRef.current.join(' '));
    if (isFinal && cleaned.trim()) {
      setTranscriptHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].text.trim().toLowerCase() === cleaned.trim().toLowerCase()) {
          return prev;
        }
        return [...prev, { time: new Date().toLocaleTimeString(), text: cleaned.trim() }];
      });
    }
  };

  // --- QUICK DEMO & COMPLETION STATE ---
  const [isDemoActive, setIsDemoActive] = useState(false);
  const isDemoActiveRef = useRef(false);
  const [isCuratedDemo, setIsCuratedDemo] = useState(false);
  const [activeDemoTopic, setActiveDemoTopic] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const lastDemoChunksRef = useRef<PlayChunk[]>([]);

  const handleQueueFinish = () => {
    if (isDemoActiveRef.current) {
      playCompletionChime();
      setShowCompletionModal(true);
      setIsDemoActive(false);
      isDemoActiveRef.current = false;
      setIsCuratedDemo(false);
      returnToRestPose();
      setSubtitles("");
    }
  };

  // --- CUSTOM HOOKS ---
  const { enqueueSiGML, enqueueChunks, pause, resume, skipForward, skipBackward, playerState, stopAll, returnToRestPose } = useCWASA(handleChunkSubtitles, onChunkStart, handleQueueFinish);

  const handleSignDetected = useCallback(async (sign: string, spokenPhrase: string) => {
    const textToDisplay = spokenPhrase || sign;
    handleSetSubtitles(textToDisplay, true);

    // Animate avatar to sign the recognized concept back
    try {
      const sigml = await textToSiGML(sign);
      if (sigml && sigml.length > 0) {
        enqueueChunks([{
          text: textToDisplay,
          sigml: sigml
        }]);
      }
    } catch (e) {
      // non-fatal
    }
  }, [enqueueChunks]);

  const stopDemoLecture = useCallback(() => {
    setIsDemoActive(false);
    isDemoActiveRef.current = false;
    setIsCuratedDemo(false);
    setActiveDemoTopic(null);
    stopAll();
    returnToRestPose();
    clearVisual();
    setSubtitles("");
    setShowCompletionModal(false);
  }, [stopAll, returnToRestPose, clearVisual]);

  const handleAIToolsSuccess = (chunks: PlayChunk[], options?: { replace?: boolean }, topicTitle?: string) => {
    if (chunks && chunks.length > 0) {
      if (!isVisualAssistEnabled) {
        setIsVisualAssistEnabled(true);
        localStorage.setItem('visual_assist_enabled', 'true');
      }
      setIsDemoActive(true);
      isDemoActiveRef.current = true;
      setIsCuratedDemo(false); // Prompt-to-Sign is dynamic AI presentation, NOT a static curated demo
      setShowCompletionModal(false);
      lastDemoChunksRef.current = chunks;
      const title = topicTitle || "AI Lecture";
      setActiveDemoTopic(title);

      // Preload visuals
      chunks.forEach(c => {
        if (c.visual_url && typeof window !== 'undefined') {
          const img = new Image();
          img.src = c.visual_url;
        }
      });

      const firstChunkWithVisual = chunks.find(c => c.visual_url || c.text);
      if (firstChunkWithVisual) {
        onChunkStart(firstChunkWithVisual);
      }

      enqueueChunks(chunks, options);
    }
  };

  // Quick Demos specifically need to REPLACE whatever's currently playing,
  // not queue behind it — clicking demo #2 while demo #1 is still going used
  // to silently wait its turn (or need a page refresh to force a reset).
  // Kept separate from handleAIToolsSuccess above because that one is also
  // used by document upload, which streams a single request's chunks in one
  // at a time — replacing on every chunk there would wipe out everything
  // that already arrived from the SAME upload.
  const handleDemoSelect = (chunks: PlayChunk[], topicTitle?: string) => {
    if (chunks && chunks.length > 0) {
      // Disengage microphone recording so avatar audio isn't heard and looped back via mic
      if (isRecording) {
        toggleMic();
      }
      // Mutual exclusivity: stop cast, close whiteboard, close screenshare/media, close sign cam & modals
      stopCastAudio();
      setIsWhiteboardOpen(false);
      setIsPdfAnnotate(false);
      setIsSignCameraOpen(false);
      setShowAITools(false);
      setShowSettings(false);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setPresentationFileUrl(null);
      setPresentationFileType(null);
      setIsScreenshare(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (!isVisualAssistEnabled) {
        setIsVisualAssistEnabled(true);
        localStorage.setItem('visual_assist_enabled', 'true');
      }
      setIsDemoActive(true);
      isDemoActiveRef.current = true;
      setIsCuratedDemo(true);
      setShowCompletionModal(false);
      lastDemoChunksRef.current = chunks;
      if (topicTitle) setActiveDemoTopic(topicTitle);

      // Preload all slideshow images into browser cache for 0ms transitions
      chunks.forEach(c => {
        if (c.visual_url && typeof window !== 'undefined') {
          const img = new Image();
          img.src = c.visual_url;
        }
      });

      // Instantly render the introductory diagram onto the green board (0ms latency)
      const firstChunkWithVisual = chunks.find(c => c.visual_url);
      if (firstChunkWithVisual) {
        onChunkStart(firstChunkWithVisual);
      } else {
        clearVisual();
      }

      enqueueChunks(chunks, { replace: true });
    }
  };

  // "Lights up" moment: a brief warm glow/spotlight sweep the instant
  // playback starts (mic speech, AI Tools, or a Quick Demo) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â fires once on
  // the false->true transition of playerState.playing, not on every chunk.
  const [showSpotlight, setShowSpotlight] = useState(false);
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (playerState.playing && !wasPlayingRef.current) {
      setShowSpotlight(true);
      const t = setTimeout(() => setShowSpotlight(false), 1800);
      wasPlayingRef.current = true;
      return () => clearTimeout(t);
    }
    wasPlayingRef.current = playerState.playing;
  }, [playerState.playing]);

  const sendTtsConfig = () => {
    if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
      wsTeacherRef.current.send(JSON.stringify({
        type: "config",
        targetLanguage,
        targetVoice,
        ttsEnabled
      }));
    }
  };

  const { sessionId, resetSession } = useSignSockets({ setSubtitles: handleSetSubtitles, enqueueSiGML, enqueueChunks, wsTeacherRef, onTeacherOpen: sendTtsConfig });
  
  const { isOnline, connectionQuality, networkType, pingMs } = useNetworkStatus(wsTeacherRef);

  const { 
    isRecording, isSpeaking, stopMic, toggleMic, statusText, statusColor, visualizerRefs, sttMode, setSttMode 
  } = useSpeechRecognition(wsTeacherRef, targetLanguage, sessionId, handleSetSubtitles);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const {
    isCastAudioActive,
    isSpeaking: isCastSpeaking,
    audioLevel: castAudioLevel,
    hasAudioTrack: castHasAudioTrack,
    isVideoMuted,
    toggleVideoMute,
    startStreamAudio,
    startVideoElementAudio,
    stopCastAudio
  } = useCastAudioToSign({
    wsTeacherRef,
    targetLanguage,
    onSubtitles: handleChunkSubtitles,
    enqueueSiGML
  });

  // Auto Sign Language during cast/video: DEFAULT TURNED ON in cast system (user can still manually toggle OFF/ON via toolbar)
  const [isAutoSignEnabled, setIsAutoSignEnabled] = useState(true);
  const castStreamRef = useRef<MediaStream | null>(null);

  const toggleAutoSign = useCallback(() => {
    setIsAutoSignEnabled(prev => {
      const next = !prev;
      if (next) {
        if (presentationFileType === 'video' && presentationVideoRef.current) {
          startVideoElementAudio(presentationVideoRef.current);
        } else if (castStreamRef.current) {
          startStreamAudio(castStreamRef.current);
        }
      } else {
        stopCastAudio();
      }
      return next;
    });
  }, [presentationFileType, startVideoElementAudio, startStreamAudio, stopCastAudio]);

  const resetAvatarState = useCallback(() => {
    stopDemoLecture();
    stopCastAudio();
    stopAll();
    returnToRestPose();
    setSubtitles("");
    sentenceBufferRef.current = [];
  }, [stopDemoLecture, stopCastAudio, stopAll, returnToRestPose]);

  const handleToggleBoard = useCallback(() => {
    resetAvatarState();
    // Mutual exclusivity: Close Screenshare / Video presentation / Sign Camera / Demos / Modals
    if (presentationFileUrl) {
      setPresentationFileUrl(null);
      setPresentationFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScreenshare(false);
    setIsSignCameraOpen(false);
    setShowAITools(false);
    setShowSettings(false);
    setIsWhiteboardOpen(prev => !prev);
  }, [resetAvatarState, presentationFileUrl]);

  const handleGoBack = useCallback(() => {
    // ALWAYS refresh the character, clear any queued signs, and return to rest pose
    resetAvatarState();

    // 0. If Sign Camera is open, close it
    if (isSignCameraOpen) {
      setIsSignCameraOpen(false);
      return;
    }

    // 1. If Whiteboard is open, close Whiteboard and return to previous view
    if (isWhiteboardOpen) {
      setIsWhiteboardOpen(false);
      setIsPdfAnnotate(false);
      return;
    }

    // 2. If Screenshare / PDF / Video presentation is active, close it
    if (isScreenshare || presentationFileUrl) {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setPresentationFileUrl(null);
      setPresentationFileType(null);
      setIsScreenshare(false);
      setIsPdfAnnotate(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 3. If modals are open, close them
    if (showSettings) {
      setShowSettings(false);
      return;
    }
    if (showAITools) {
      setShowAITools(false);
      return;
    }

    // 4. If in Visual Mode without demo, return to Classroom Mode
    if (visualMode === 'visual' && !isDemoActive && !isDemoActiveRef.current) {
      setVisualMode('classroom');
      return;
    }

    // 5. Stay on refreshed classroom page, never navigate back to try demo landing page
    if (typeof window !== 'undefined') {
      window.location.href = "/classroom";
    }
  }, [
    isSignCameraOpen,
    isWhiteboardOpen,
    isScreenshare,
    presentationFileUrl,
    isDemoActive,
    visualMode,
    showSettings,
    showAITools,
    stopDemoLecture,
    stopCastAudio,
    stopAll,
    returnToRestPose,
    setVisualMode
  ]);



  const handleResetClassroom = () => {
    if (isRecording) {
      toggleMic();
    }
    stopCastAudio();
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setPresentationFileUrl(null);
    setPresentationFileType(null);
    setIsScreenshare(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    stopAll();
    clearVisual();
    setIsWhiteboardOpen(false);
    setIsDemoActive(false);
    isDemoActiveRef.current = false;
    setSubtitles("");
    setShowCompletionModal(false);
    window.location.href = "/classroom";
  };

  useEffect(() => {
    if (presentationFileType === 'video' && presentationVideoRef.current && isAutoSignEnabled) {
      startVideoElementAudio(presentationVideoRef.current);
    }
  }, [presentationFileType, presentationFileUrl, isAutoSignEnabled, startVideoElementAudio]);

  // --- AUTO-HIDE BARS DURING TEACHING / DEMO / CAST / PDF / WHITEBOARD & ON MOBILE UI ---
  const isActivelyTeaching = 
    isDemoActive || 
    isScreenshare || 
    presentationFileType === 'video' || 
    presentationFileType === 'pdf' || 
    isWhiteboardOpen;

  // Responsive mobile detection (screen width, touch device, orientation)
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints ?? 0) > 0;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmall = window.innerWidth < 768;
      setIsMobileScreen(isSmall || isMobileUA || isTouch);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    window.addEventListener("orientationchange", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("orientationchange", checkMobile);
    };
  }, []);

  const showControlBarTemporarily = useCallback(() => {
    setIsControlBarVisible(true);
    if (controlBarTimerRef.current) {
      clearTimeout(controlBarTimerRef.current);
      controlBarTimerRef.current = null;
    }
    if (isActivelyTeaching) {
      controlBarTimerRef.current = setTimeout(() => {
        setIsControlBarVisible(false);
      }, 10000); // 10 seconds auto-hide
    }
  }, [isActivelyTeaching]);

  const showTopBarTemporarily = useCallback(() => {
    setIsTopBarVisible(true);
    if (topBarTimerRef.current) {
      clearTimeout(topBarTimerRef.current);
      topBarTimerRef.current = null;
    }
    // For mobile UI or when actively teaching, auto-hide after 8 seconds of inactivity matching mic part
    if (isMobileScreen || isActivelyTeaching) {
      topBarTimerRef.current = setTimeout(() => {
        setIsTopBarVisible(false);
      }, 8000);
    }
  }, [isMobileScreen, isActivelyTeaching]);

  const showBarsTemporarily = useCallback(() => {
    showControlBarTemporarily();
    showTopBarTemporarily();
  }, [showControlBarTemporarily, showTopBarTemporarily]);

  // When active teaching begins, hide bars with smooth animation.
  // On mobile UI, auto-hide top bar after initial 5 seconds so the screen is uncluttered
  useEffect(() => {
    if (isActivelyTeaching) {
      const hideTimer = setTimeout(() => {
        setIsControlBarVisible(false);
        setIsTopBarVisible(false);
      }, 1200);
      return () => clearTimeout(hideTimer);
    } else if (isMobileScreen) {
      // On mobile in normal classroom, show top bar initially for 5s then glide up
      const initTimer = setTimeout(() => {
        setIsTopBarVisible(false);
      }, 5000);
      return () => clearTimeout(initTimer);
    } else {
      if (controlBarTimerRef.current) {
        clearTimeout(controlBarTimerRef.current);
        controlBarTimerRef.current = null;
      }
      if (topBarTimerRef.current) {
        clearTimeout(topBarTimerRef.current);
        topBarTimerRef.current = null;
      }
      setIsControlBarVisible(true);
      setIsTopBarVisible(true);
    }
  }, [isActivelyTeaching, isMobileScreen]);

  // Proximity detection: moving cursor to bottom 70px reveals control bar, top 60px reveals top bar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isActivelyTeaching && e.clientY >= window.innerHeight - 70) {
        showControlBarTemporarily();
      }
      if ((isMobileScreen || isActivelyTeaching) && e.clientY <= 60) {
        showTopBarTemporarily();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isActivelyTeaching, isMobileScreen, showControlBarTemporarily, showTopBarTemporarily]);

  // On touch devices, tapping anywhere in top 70px smoothly reveals top bar
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isMobileScreen || isActivelyTeaching) {
        const touchY = e.touches[0]?.clientY;
        if (touchY !== undefined && touchY <= 70) {
          showTopBarTemporarily();
        }
      }
    };
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    return () => window.removeEventListener("touchstart", handleTouchStart);
  }, [isMobileScreen, isActivelyTeaching, showTopBarTemporarily]);

  // Load persisted settings from localStorage on mount (avoids SSR hydration
  // mismatch by only reading localStorage client-side, after first render).
  useEffect(() => {
    const savedAvatar = localStorage.getItem("cwasa_avatar");
    if (savedAvatar) {
      if (savedAvatar === 'prachi' || savedAvatar === 'francoise' || savedAvatar === 'soumya') {
        setAvatarName('luna');
        localStorage.setItem('cwasa_avatar', 'luna');
      } else {
        setAvatarName(savedAvatar);
      }
    }
    const savedVisual = localStorage.getItem("visual_assist_enabled");
    if (savedVisual === 'true') setIsVisualAssistEnabled(true);

    const savedTeacherName = localStorage.getItem("static_teacher_name");
    if (savedTeacherName) setTeacherName(savedTeacherName);
    const savedTopic = localStorage.getItem("static_topic");
    if (savedTopic) setTopic(savedTopic);
    // Key renamed to _v2 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â default just flipped true->false, and a browser
    // that loaded this page before tonight already has "true" saved under
    // the old key, which would silently override the new default right
    // back to on (same class of bug as characterScale/targetVoice above).
    const savedShowAvatarBg = localStorage.getItem("static_show_avatar_bg_v2");
    if (savedShowAvatarBg !== null) setShowAvatarBg(savedShowAvatarBg === 'true');
    const savedTargetLanguage = localStorage.getItem("static_target_language");
    if (savedTargetLanguage) setTargetLanguage(savedTargetLanguage);
    const savedTargetVoice = localStorage.getItem("static_target_voice_v2");
    if (savedTargetVoice) setTargetVoice(savedTargetVoice);
    const savedTtsEnabled = localStorage.getItem("static_tts_enabled");
    if (savedTtsEnabled !== null) setTtsEnabled(savedTtsEnabled === 'true');
    const savedCharacterScale = localStorage.getItem("static_character_scale_v4");
    if (savedCharacterScale) {
      const parsed = Number(savedCharacterScale);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 3) {
        setCharacterScale(parsed);
      } else {
        setCharacterScale(1.5);
      }
    }
    const savedFullSentenceCaptions = localStorage.getItem("static_full_sentence_captions");
    if (savedFullSentenceCaptions !== null) setFullSentenceCaptions(savedFullSentenceCaptions === 'true');
    else setFullSentenceCaptions(true);
    const savedClassroomAmbience = localStorage.getItem("static_classroom_ambience");
    if (savedClassroomAmbience !== null) setClassroomAmbience(savedClassroomAmbience === 'true');

    const computeDefaultRndBox = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      const isMobileLandscape = isLandscape && h < 550;
      const isTablet = w >= 600 && w <= 1024;

      if (isMobileLandscape) {
        // Mobile Landscape (e.g. 844x390, 932x430)
        const boxW = Math.min(250, Math.round(w * 0.32));
        const boxH = Math.min(310, Math.round(h * 0.80));
        return {
          position: {
            x: Math.max(10, w - boxW - 16),
            y: 20
          },
          size: { width: boxW, height: boxH }
        };
      } else if (isTablet) {
        if (isLandscape) {
          // Tablet Landscape (e.g. 1024x768)
          const boxW = Math.min(360, Math.round(w * 0.36));
          const boxH = Math.min(460, Math.round(h * 0.65));
          return {
            position: {
              x: Math.max(10, w - boxW - 24),
              y: 40
            },
            size: { width: boxW, height: boxH }
          };
        } else {
          // Tablet Portrait (e.g. 768x1024)
          const boxW = Math.min(320, Math.round(w * 0.44));
          const boxH = Math.min(420, Math.round(h * 0.42));
          return {
            position: {
              x: Math.max(10, w - boxW - 16),
              y: 50
            },
            size: { width: boxW, height: boxH }
          };
        }
      } else if (w < 768) {
        // Mobile Portrait (e.g. 390x844)
        const boxW = Math.min(260, Math.round(w * 0.65));
        const boxH = Math.min(340, Math.round(h * 0.45));
        return {
          position: {
            x: Math.max(10, Math.round((w - boxW) / 2)),
            y: 50
          },
          size: { width: boxW, height: boxH }
        };
      } else {
        // Desktop / Large screens: Character positioned upright at the right side with full body and arms in view
        const baseW = 480;
        const baseH = 480;
        const targetX = Math.round(w - 35 - (430 * characterScale));
        return {
          position: {
            x: Math.max(10, targetX),
            y: characterScale >= 2.5 ? 20 : 35
          },
          size: { width: baseW, height: baseH }
        };
      }
    };

    // Initialize or load clamped position from localStorage
    const defaultBox = computeDefaultRndBox();
    let initialPosition = defaultBox.position;
    try {
      const savedPos = localStorage.getItem('signova_avatar_pip_pos_v5');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const w = window.innerWidth;
          // STRICT SAFETY CLAMP: Avatar must NEVER sink downwards to the bottom on refresh
          const safeY = Math.max(10, Math.min(parsed.y, characterScale >= 2.5 ? 25 : 50));
          // Avatar can be placed anywhere across the screen
          const safeX = Math.max(-200, Math.min(parsed.x, w - 80));
          initialPosition = { x: safeX, y: safeY };
        }
      }
    } catch (e) {}

    setRndBox({
      position: initialPosition,
      size: defaultBox.size
    });
    setIsClient(true);

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setRndBox(prev => {
        const safeX = Math.max(-200, Math.min(prev.position.x, w - 80));
        const safeY = Math.max(5, Math.min(prev.position.y, h - 80));
        return {
          ...prev,
          position: { x: safeX, y: safeY }
        };
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Persist settings whenever they change, so a refresh doesn't reset the session
  useEffect(() => { localStorage.setItem("static_teacher_name", teacherName); }, [teacherName]);
  useEffect(() => { localStorage.setItem("static_topic", topic); }, [topic]);
  useEffect(() => { localStorage.setItem("static_show_avatar_bg_v2", String(showAvatarBg)); }, [showAvatarBg]);
  useEffect(() => { localStorage.setItem("static_target_language", targetLanguage); }, [targetLanguage]);
  useEffect(() => { localStorage.setItem("static_target_voice_v2", targetVoice); }, [targetVoice]);
  useEffect(() => { localStorage.setItem("static_tts_enabled", String(ttsEnabled)); }, [ttsEnabled]);
  useEffect(() => { localStorage.setItem("static_character_scale_v5", String(characterScale)); }, [characterScale]);
  useEffect(() => { localStorage.setItem("static_full_sentence_captions", String(fullSentenceCaptions)); }, [fullSentenceCaptions]);
  useEffect(() => { localStorage.setItem("static_classroom_ambience", String(classroomAmbience)); }, [classroomAmbience]);

  const toggleVisualAssist = () => {
    const next = !isVisualAssistEnabled;
    setIsVisualAssistEnabled(next);
    localStorage.setItem('visual_assist_enabled', String(next));
    if (!next) clearVisual();
  };

  // When switching INTO classroom mode, snap the avatar box to a sensible spot beside the smartboard
  useEffect(() => {
    if (visualMode === 'classroom' && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const baseW = isMobile ? 240 : 480;
      const baseH = isMobile ? 320 : 480;
      const mobileX = Math.max(10, Math.round((window.innerWidth - baseW) / 2));
      const targetY = characterScale >= 2.5 ? 20 : 35;
      const desktopX = Math.round(window.innerWidth - 35 - (430 * characterScale));
      setRndBox(prev => ({
        position: {
          x: isMobile ? mobileX : Math.max(20, desktopX),
          y: Math.max(10, Math.min(prev.position.y, targetY))
        },
        size: { width: baseW, height: baseH }
      }));
    }
  }, [visualMode, characterScale]);

  // Visual Mode positioning adapted for screen layout
  useEffect(() => {
    if (visualMode === 'visual' && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;
      const baseW = isMobile ? 240 : 480;
      const baseH = isMobile ? 320 : 480;
      const effectiveScale = isMobile ? 1.0 : characterScale;
      const boxW = baseW * effectiveScale;
      const targetY = characterScale >= 2.5 ? 20 : 35;
      setRndBox(prev => ({
        position: {
          x: Math.max(10, Math.round(window.innerWidth - boxW - (isMobile ? 12 : window.innerWidth * 0.03))),
          y: Math.max(10, Math.min(prev.position.y, targetY))
        },
        size: { width: baseW, height: baseH }
      }));
    }
  }, [visualMode, characterScale]);

  // When character zoom changes, ensure the avatar stays anchored near top and never sinks downwards or clips on the right
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setRndBox(prev => {
      const isMobile = window.innerWidth < 768;
      const targetMaxY = characterScale >= 2.5 ? 20 : (characterScale >= 2 ? 30 : 40);
      const safeY = Math.max(10, Math.min(prev.position.y, targetMaxY));
      const optimalX = Math.round(window.innerWidth - 35 - (430 * characterScale));
      const safeX = isMobile ? prev.position.x : Math.min(prev.position.x, Math.max(20, optimalX));
      return {
        ...prev,
        position: { x: safeX, y: safeY }
      };
    });
  }, [characterScale]);

  // Sync TTS config to backend when it changes
  useEffect(() => {
    sendTtsConfig();
  }, [targetLanguage, targetVoice, ttsEnabled]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (!playerState.hasQueue && !playerState.hasHistory) return;

      switch(e.code) {
        case 'Space':
          e.preventDefault();
          if (playerState.paused) resume();
          else pause();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward(5);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward(5);
          break;

      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerState.hasQueue, playerState.hasHistory, playerState.paused, pause, resume, skipForward, skipBackward]);

  // --- SCREENSHARE & UPLOAD LOGIC ---

  const toggleScreenshare = async () => {
    // Immediately reset avatar state, stop demos, close whiteboard & modals
    resetAvatarState();
    setIsWhiteboardOpen(false);
    setIsSignCameraOpen(false);
    setShowAITools(false);
    setShowSettings(false);

    if (!isScreenshare || presentationFileUrl) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true, 
          audio: true // Captures tab and video audio during casting
        });
        castStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPresentationFileUrl(null);
        setPresentationFileType(null);
        setIsScreenshare(true);

        // Auto sign language is DEFAULT ON in the cast system
        setIsAutoSignEnabled(true);
        startStreamAudio(stream);

        stream.getVideoTracks()[0].onended = () => {
          resetAvatarState();
          castStreamRef.current = null;
          setIsScreenshare(false);
          if (videoRef.current) videoRef.current.srcObject = null;
        };
      } catch (err) {
        console.error("Screenshare failed", err);
      }
    } else {
      resetAvatarState();
      castStreamRef.current = null;
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsScreenshare(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Immediately reset avatar state, close whiteboard & modals
    resetAvatarState();
    setIsWhiteboardOpen(false);
    setIsSignCameraOpen(false);
    setShowAITools(false);
    setShowSettings(false);

    const url = URL.createObjectURL(file);
    setPresentationFileUrl(url);
    
    let fileType: "video" | "image" | "pdf" = "image";
    if (file.type.startsWith('video/')) fileType = "video";
    else if (file.type === 'application/pdf') fileType = "pdf";
    setPresentationFileType(fileType);
    
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScreenshare(true);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden font-sans bg-transparent select-none">
      {/* Mobile Top Reveal Tap Indicator */}
      {(isMobileScreen || isActivelyTeaching) && !isTopBarVisible && (
        <div className="fixed top-1.5 left-1/2 -translate-x-1/2 z-[115] pointer-events-auto cursor-pointer animate-in fade-in duration-300">
          <button 
            id="top-menu-reveal-btn"
            type="button"
            onClick={showTopBarTemporarily}
            onTouchStart={showTopBarTemporarily}
            className="bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer select-none"
            title="Tap to reveal header and controls"
          >
            <i className="fas fa-chevron-down text-[9px] text-purple-400 animate-bounce"></i>
            <span>Menu & Options</span>
          </button>
        </div>
      )}

      {/* Unified Responsive Top Navigation Bar */}
      <header 
        className={`fixed top-0 inset-x-0 z-[110] transition-all duration-500 ease-out pointer-events-none p-2 sm:p-5 flex flex-col gap-1.5 ${
          (isMobileScreen || isActivelyTeaching) && !isTopBarVisible && !isDemoActive
            ? '-translate-y-[120%] opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
        onMouseEnter={showTopBarTemporarily}
        onTouchStart={showTopBarTemporarily}
      >
        {/* Main Header Row: Back, Teacher, Room, Lang, Layout */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 w-full max-w-full">
          {/* Left side: Back & Teacher Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto min-w-0 shrink">
            <button 
              onClick={handleGoBack}
              className="group shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600/90 to-blue-600/90 hover:from-indigo-500 hover:to-blue-500 backdrop-blur-xl border border-indigo-400/40 text-white shadow-lg shadow-indigo-950/40 px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer"
              title="Back / Return to Previous View"
            >
              <i className="fas fa-arrow-left text-[11px] sm:text-sm transition-transform group-hover:-translate-x-1"></i>
              <span className="font-bold tracking-wide">Back</span>
            </button>
            <TeacherHeader avatarName={avatarName} className="max-w-[125px] xs:max-w-[170px] sm:max-w-xs md:max-w-md" />
          </div>

          {/* Right side controls (when not screenshare) */}
          {!isScreenshare && (
            <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
              {/* Room / Network Badge */}
              <div className="bg-black/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 shadow-xl text-[10px] sm:text-sm text-gray-300">
                <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                  !isOnline || connectionQuality === 'offline' 
                    ? 'bg-red-500 ring-2 ring-red-400 animate-ping' 
                    : 'bg-emerald-400 animate-pulse'
                }`} />
                <span className="font-mono text-white/90 font-medium">
                  {sessionId ? sessionId.slice(-4).toUpperCase() : '...'}
                </span>
                {/* Real-time Ping Latency Display */}
                <span className={`text-[9px] sm:text-xs font-mono px-1 py-0.5 rounded font-bold ${
                  !isOnline || connectionQuality === 'offline'
                    ? 'text-red-400 bg-red-950/60'
                    : 'text-emerald-400 bg-emerald-950/60'
                }`}>
                  {!isOnline || connectionQuality === 'offline' ? 'Offline' : (pingMs !== null ? `${pingMs}ms` : 'Good')}
                </span>
                <button
                  onClick={resetSession}
                  className="text-[9px] bg-white/10 hover:bg-white/20 text-white px-1 py-0.5 rounded cursor-pointer"
                  title="Create new private session"
                >
                  New
                </button>
              </div>


              {/* Language Selector */}
              <div className="bg-black/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center shadow-xl">
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setTargetLanguage(newLang);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("selected_classroom_language", newLang);
                    }
                    const matchedVoice = getVoiceForLanguage(newLang, getAvatarGender(avatarName));
                    if (matchedVoice) setTargetVoice(matchedVoice);
                    if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
                      wsTeacherRef.current.send(JSON.stringify({
                        type: "config",
                        targetLanguage: newLang,
                        targetVoice: matchedVoice
                      }));
                    }
                  }}
                  className="bg-transparent text-white font-medium text-[11px] sm:text-sm focus:outline-none cursor-pointer appearance-none pr-3.5 sm:pr-5 max-w-[70px] xs:max-w-[90px] sm:max-w-none truncate"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.1rem top 50%", backgroundSize: "0.5rem auto" }}
                >
                  <option value="English" className="bg-slate-900 text-xs sm:text-base">English</option>
                  <option value="Hindi" className="bg-slate-900 text-xs sm:text-base">Hindi (हिन्दी)</option>
                  <option value="Marathi" className="bg-slate-900 text-xs sm:text-base">Marathi (मराठी)</option>
                  <option value="Malayalam" className="bg-slate-900 text-xs sm:text-base">Malayalam (മലയാളം)</option>
                  <option value="Telugu" className="bg-slate-900 text-xs sm:text-base">Telugu (తెలుగు)</option>
                  <option value="Kannada" className="bg-slate-900 text-xs sm:text-base">Kannada (ಕನ್ನಡ)</option>
                </select>
              </div>

              {/* Layout Mode Switcher */}
              {isVisualAssistEnabled && (
                <div className="bg-black/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 p-0.5 sm:p-1 flex items-center gap-0.5 shadow-xl">
                  {([
                    { mode: 'visual' as const, icon: '🖼️', title: 'Visual Mode' },
                    { mode: 'classroom' as const, icon: '🎓', title: 'Classroom Mode' },
                  ]).map(({ mode, icon, title }) => (
                    <button
                      key={mode}
                      onClick={() => setVisualMode(mode)}
                      title={title}
                      className={`w-6 h-6 sm:w-10 sm:h-8 rounded-lg text-xs sm:text-base flex items-center justify-center transition-all ${
                        visualMode === mode ? 'bg-white/25 text-white shadow-sm' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}

              {/* Fullscreen / Expand Button */}
              <div className="bg-black/65 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10 p-0.5 sm:p-1 flex items-center shadow-xl">
                <button
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  className={`w-6 h-6 sm:w-10 sm:h-8 rounded-lg text-xs sm:text-base flex items-center justify-center transition-all cursor-pointer ${
                    isFullscreen
                      ? 'bg-teal-500/30 text-teal-300 shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-xs sm:text-sm`}></i>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Screenshare / PDF Presentation Action Toolbar */}
        {isScreenshare && (
          <div className="flex items-center justify-start sm:justify-end gap-1.5 pointer-events-auto max-w-full overflow-x-auto no-scrollbar py-0.5 pl-0.5">
            {/* Interactive Auto-Sign Toggle Button (Default OFF, manual toggle ON/OFF) */}
            <button
              type="button"
              onClick={toggleAutoSign}
              className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-xl border shadow-xl flex items-center gap-1.5 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0 ${
                isAutoSignEnabled
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200 shadow-emerald-950/50'
                  : 'bg-black/70 hover:bg-black/90 border-white/20 text-gray-300'
              }`}
              title={isAutoSignEnabled ? "Auto Sign Language is ON (Click to turn OFF)" : "Auto Sign Language is OFF (Click to turn ON)"}
            >
              <span className="text-sm">🤟</span>
              <span>Auto-Sign: <strong className={isAutoSignEnabled ? 'text-emerald-400' : 'text-gray-400'}>{isAutoSignEnabled ? 'ON' : 'OFF'}</strong></span>
              {isAutoSignEnabled && isCastSpeaking && (
                <span className="bg-emerald-500/30 text-emerald-300 text-[9px] px-1 py-0.2 rounded uppercase font-bold tracking-wider animate-pulse ml-0.5">
                  Live
                </span>
              )}
            </button>
            {presentationFileType === 'pdf' && (
              <button
                onClick={() => {
                  setIsPdfAnnotate(true);
                  setIsWhiteboardOpen(true);
                }}
                className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 backdrop-blur-xl border border-purple-400/50 text-white shadow-xl flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
                title="Annotate, Underline, Circle, and Type directly on opened PDF"
              >
                <i className="fas fa-pen-to-square text-amber-300 text-xs"></i>
                <span>✏️ Annotate PDF</span>
              </button>
            )}
            {presentationFileType === 'pdf' && (
              <button
                onClick={() => {
                  setIsPdfAnnotate(false);
                  setIsWhiteboardOpen(true);
                }}
                className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-emerald-950/90 hover:bg-emerald-900/90 backdrop-blur-xl border border-emerald-500/40 text-emerald-200 shadow-xl flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
                title="Switch to Full Chalkboard"
              >
                <i className="fas fa-chalkboard text-emerald-400 text-xs"></i>
                <span>Chalkboard</span>
              </button>
            )}
            <button
              onClick={toggleVideoMute}
              className={`px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-xl border shadow-xl flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0 ${isVideoMuted ? 'bg-amber-950/80 border-amber-500/50 text-amber-200' : 'bg-slate-900/80 border-white/20 text-white'}`}
              title={isVideoMuted ? "Unmute Video Audio" : "Mute Video Audio"}
            >
              <i className={`fas ${isVideoMuted ? 'fa-volume-xmark text-amber-400' : 'fa-volume-high text-emerald-400'} text-xs`}></i>
              <span>{isVideoMuted ? 'Unmute' : 'Sound'}</span>
            </button>
            <button 
              onClick={() => {
                stopCastAudio();
                setPresentationFileUrl(null);
                setPresentationFileType(null);
                setIsScreenshare(false);
                setIsPdfAnnotate(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/30 text-white shadow-xl flex items-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer shrink-0"
              title="Close File Presentation"
            >
              <i className="fas fa-times text-xs text-red-400"></i>
              <span>Close</span>
            </button>
          </div>
        )}
      </header>
      
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[250] flex items-center gap-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl shadow-2xl shadow-red-950/60 border border-red-400/50 backdrop-blur-xl animate-bounce pointer-events-auto">
          <span className="text-base sm:text-lg">⚠️</span>
          <div className="flex flex-col">
            <span className="font-bold text-xs sm:text-sm">You are offline</span>
            <span className="text-[10px] sm:text-xs text-red-100">Please check your internet connection to continue</span>
          </div>
        </div>
      )}




      <OnboardingTour />

      {/* Classroom Ambience (opt-in, Settings > Character): a warm directional
          "window light" layered on top of the existing symmetric glow above ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  
          additive only, nothing is removed, so with the toggle off this is
          simply absent and the look is unchanged.
          Bumped noticeably stronger than the first pass (0.10/0.08 -> 0.24/0.16)
          ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  at the original opacity this was indistinguishable from the
          existing purple/blue/emerald blobs already on screen; it needs a
          real, perceptible color shift to read as "different" at a glance. */}
      {classroomAmbience && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 12% 15%, rgba(251,191,36,0.24) 0%, transparent 55%), radial-gradient(ellipse 50% 70% at 100% 100%, rgba(59,130,246,0.16) 0%, transparent 60%)'
          }}
        />
      )}

      {/* "Lights up" moment ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â  a warm spotlight sweep the instant
          starts (mic speech, AI Tools, or a Quick Demo), like stage lights
          coming on. Pure CSS opacity fade, no layout impact, non-interactive. */}
      <div
        className="absolute inset-0 z-[6] pointer-events-none transition-opacity duration-[1400ms] ease-out"
        style={{
          opacity: showSpotlight ? 1 : 0,
          background: 'radial-gradient(circle at 50% 40%, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.12) 30%, transparent 65%)'
        }}
      />

      {/* REAL Screenshare Video / File Stream Background */}
      <div className={`absolute inset-0 z-0 transition-all duration-700 ease-in-out flex justify-center items-center ${
        isScreenshare && !(isWhiteboardOpen && !isPdfAnnotate) 
          ? 'opacity-100 bg-slate-950' 
          : 'opacity-0 pointer-events-none'
      }`}>
        <div className="w-full h-full relative flex justify-center items-center">
          {presentationFileUrl ? (
            presentationFileType === 'video' ? (
              <video ref={presentationVideoRef} src={presentationFileUrl} autoPlay loop muted={isVideoMuted} playsInline className="w-full h-full object-contain relative z-10" />
            ) : presentationFileType === 'pdf' ? (
              <iframe src={`${presentationFileUrl}#toolbar=1&navpanes=0`} className="w-full h-full relative z-10 bg-white" title="PDF Presentation" />
            ) : (
              <>
                <div className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40 blur-3xl scale-110" style={{ backgroundImage: `url('${presentationFileUrl}')` }} />
                <img src={presentationFileUrl} alt="Presentation" className="relative z-10 w-full h-full object-contain drop-shadow-2xl" />
              </>
            )
          ) : (
            <video ref={videoRef} autoPlay playsInline muted={isVideoMuted} className="w-full h-full object-contain relative z-10" />
          )}
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="video/*, image/*, application/pdf" className="hidden" />

      {/* Visual Assist Panel + Avatar — Single-mount approach */}
      {(() => {
        const isBoardActive = isVisualAssistEnabled && (visualMode === 'classroom' || visualMode === 'visual') && !isScreenshare && !isWhiteboardOpen;
        const isVisualModeSelected = (visualMode === 'visual' || visualMode === 'classroom') && !isScreenshare;
        // The avatar should be in PiP mode (framed/sizable) if we are in 'classroom' or 'visual' mode or whiteboard is open,
        // even if the visual board itself is hidden.
        const isPiP = isScreenshare || isVisualModeSelected || isWhiteboardOpen;
        
        // SignAvatar's internal `isVisualAssist` prop (which toggles its framing style)
        // should match isPiP so it always stays cropped correctly when shifted aside.
        const isVisualActive = isVisualModeSelected || isWhiteboardOpen;

        return (
          <>
            {/* Interactive Smart Teaching Whiteboard & Digital Chalkboard & PDF Annotation Layer */}
            {isWhiteboardOpen && (
              <SmartWhiteboard
                isOpen={isWhiteboardOpen}
                onClose={() => {
                  resetAvatarState();
                  setIsWhiteboardOpen(false);
                  setIsPdfAnnotate(false);
                }}
                targetLanguage={targetLanguage}
                targetVoice={targetVoice}
                ttsEnabled={ttsEnabled}
                onProcessSuccess={handleAIToolsSuccess}
                onStatusChange={setAiProcessingStatus}
                isPdfAnnotateMode={isPdfAnnotate && presentationFileType === 'pdf'}
                pdfUrl={presentationFileUrl}
                onTogglePdfMode={() => setIsPdfAnnotate(prev => !prev)}
              />
            )}

            {/* Classroom layout & Visual mode layout:
                Framed authentic "smartboard green board" showing visual content.
                - In Classroom mode: board positioned on the left with avatar on the right.
                - In Visual mode: full-screen cinema smartboard centered, matching classroom board styling. */}
            {isBoardActive && (
              <div className={`absolute inset-0 z-[5] flex pointer-events-none transition-all duration-700 ${
                visualMode === 'visual'
                  ? "items-center justify-center pt-8 sm:pt-4 pb-16 sm:pb-8 px-2 sm:px-6"
                  : "items-start landscape:items-center md:items-center justify-center landscape:justify-start md:justify-start pt-14 landscape:pt-0 md:pt-0 px-3 landscape:pl-[3vw] md:pl-[5vw]"
              }`}>
                <div className={`relative pointer-events-auto transition-all duration-700 ${
                  visualMode === 'visual'
                    ? "w-[94vw] max-w-7xl aspect-[16/9.5] max-h-[85vh] flex flex-col justify-center"
                    : "w-full landscape:w-[54vw] md:w-[55vw] max-w-sm sm:max-w-xl landscape:max-w-none md:max-w-5xl"
                }`}>
                  {/* Green chalkboard smartboard bezel */}
                  <div className={`relative w-full h-full aspect-[16/10] sm:aspect-[16/9.5] bg-gradient-to-b from-[#1b2f23] via-[#102318] to-[#091810] border transition-all duration-500 flex flex-col ${
                    classroomAmbience
                      ? "rounded-[24px] sm:rounded-[32px] border-emerald-400/50 shadow-[0_0_60px_rgba(52,211,153,0.3),0_40px_100px_rgba(0,0,0,0.8)] p-3 sm:p-5"
                      : "rounded-[20px] sm:rounded-[28px] border-emerald-500/30 shadow-[0_30px_80px_rgba(0,0,0,0.65),0_0_30px_rgba(16,185,129,0.15)] p-2.5 sm:p-4"
                  }`}>
                    {/* Screen */}
                    <div className="relative w-full h-full flex-1 rounded-xl overflow-hidden bg-[#06180f] ring-1 ring-emerald-500/20">
                      <VisualAssistPanel
                        visual={visual}
                        visualMode={visualMode}
                        setVisualMode={setVisualMode}
                        embedded
                        activeDemoTopic={activeDemoTopic}
                        isDemoActive={isDemoActive}
                        isCuratedDemo={isCuratedDemo}
                        onUploadClick={() => {
                          stopDemoLecture();
                          fileInputRef.current?.click();
                        }}
                        onFileDrop={(file) => {
                          stopDemoLecture();
                          stopCastAudio();
                          const url = URL.createObjectURL(file);
                          setPresentationFileUrl(url);
                          let fileType: "video" | "image" | "pdf" = "image";
                          if (file.type.startsWith('video/')) fileType = "video";
                          else if (file.type === 'application/pdf') fileType = "pdf";
                          setPresentationFileType(fileType);
                          setIsScreenshare(true);
                        }}
                      />
                      {/* Glass sheen */}
                      {classroomAmbience && (
                        <div
                          className="absolute inset-0 pointer-events-none z-20"
                          style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 22%, transparent 40%)' }}
                        />
                      )}
                    </div>
                    {/* Bottom Chalk Tray Ledge */}
                    <div className="absolute -bottom-1.5 left-8 right-8 h-2 rounded-full bg-gradient-to-r from-[#292524] via-[#44403c] to-[#292524] border-t border-emerald-500/20 shadow-md flex items-center justify-end px-3 gap-1.5 opacity-90">
                      <div className="w-5 h-1 bg-white/90 rounded-full" title="White Chalk" />
                      <div className="w-3.5 h-1 bg-amber-200/90 rounded-full" title="Yellow Chalk" />
                    </div>
                    {/* Power LED */}
                    <div className="absolute bottom-2 right-4 sm:right-5 w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.7)]" />
                  </div>
                  {/* Stand neck + base, like a mounted classroom smartboard — hidden on mobile and in full-screen visual mode */}
                  {visualMode === 'classroom' && (
                    <>
                      <div className={`hidden md:block absolute left-1/2 -translate-x-1/2 top-full bg-gradient-to-b from-[#0b0e15] to-[#05070b] ${classroomAmbience ? "w-4 h-14" : "w-3 h-10"}`} />
                      <div className={`hidden md:block absolute left-1/2 -translate-x-1/2 rounded-full bg-black/60 blur-[2px] ${classroomAmbience ? "top-[calc(100%+3.5rem)] w-48 h-4" : "top-[calc(100%+2.5rem)] w-40 h-3"}`} />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Avatar — ALWAYS the same <Rnd> instance, so SignAvatar's CWASA
                WebGL canvas is truly never unmounted/remounted when toggling
                between fullscreen and PiP (visual mode / screenshare). Doing
                that via two different element types used to tear down and
                reinit the canvas, corrupting it until a page refresh. */}
            <Rnd
              key="avatar-rnd"
              size={isPiP
                ? { width: rndBox.size.width * characterScale, height: rndBox.size.height * characterScale }
                : { width: '100%', height: '100%' }
              }
              position={isPiP ? rndBox.position : { x: 0, y: 0 }}
              enableUserSelectHack={false}
              onDragStart={() => {
                if (typeof window !== 'undefined') {
                  window.getSelection()?.removeAllRanges();
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }
              }}
              onDragStop={(_e, d) => {
                // Allow avatar to be placed freely anywhere across the screen
                setRndBox(prev => {
                  const next = { ...prev, position: { x: d.x, y: d.y } };
                  try {
                    localStorage.setItem('signova_avatar_pip_pos_v5', JSON.stringify(next.position));
                  } catch (e) {}
                  return next;
                });
              }}
              onResizeStop={(_e, _dir, ref, _delta, position) => {
                // ref.offsetWidth/Height are in on-screen (already-scaled) pixels — 
                // store the un-scaled base size so characterScale keeps applying
                // cleanly on top of it next render instead of compounding.
                setRndBox({
                  size: { width: ref.offsetWidth / characterScale, height: ref.offsetHeight / characterScale },
                  position
                });
              }}
              minWidth={isPiP ? 180 * characterScale : undefined}
              minHeight={isPiP ? 220 * characterScale : undefined}
              maxWidth={isPiP ? 600 * characterScale : undefined}
              maxHeight={isPiP ? 700 * characterScale : undefined}
              // No bounds constraint: the box can legitimately be taller
              // than the viewport now (characterScale defaults to a size
              // well past typical screen heights) — bounds="window" was
              // telling react-rnd to keep the WHOLE box inside the window,
              // which is impossible once the box itself is taller than the
              // window, and it responded by refusing vertical movement
              // rather than erroring. Free dragging (including partially
              // off-screen, if the user chooses to put it there) fixes that.
              disableDragging={!isPiP}
              enableResizing={isPiP
                ? { top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }
                : false
              }
              dragHandleClassName="avatar-character-handle"
              style={{
                zIndex: isPiP ? 50 : 0,
                position: isPiP ? 'absolute' : 'fixed',
                inset: isPiP ? undefined : 0,
                pointerEvents: isPiP && !showAvatarBg ? 'none' : 'auto'
              }}
              className={`transition-[border-radius,box-shadow] duration-300 ${
                isPiP
                  ? (showAvatarBg
                      ? "shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-sm border-2 border-white/80 bg-[#111111] overflow-hidden pointer-events-auto"
                      : "overflow-visible pointer-events-none")
                  : "overflow-hidden"
              }`}
            >
              <div className="w-full h-full relative overflow-visible pointer-events-none select-none">
                {isClient && (
                  <SignAvatar
                    avatarName={avatarName}
                    isScreenshare={isScreenshare}
                    isVisualAssist={isVisualActive}
                    pipBoxHeight={isPiP ? rndBox.size.height * characterScale : undefined}
                    characterScale={characterScale}
                  />
                )}

                {/* Specific Drag Handle strictly over the Avatar Character Silhouette - tightly reduced to human body bounds so only clicking the avatar drags */}
                {isPiP && (
                  <div
                    onMouseDown={() => {
                      if (typeof window !== 'undefined') {
                        window.getSelection()?.removeAllRanges();
                        if (document.activeElement instanceof HTMLElement) {
                          document.activeElement.blur();
                        }
                      }
                    }}
                    style={{
                      width: `${Math.max(65, Math.round((typeof window !== 'undefined' && window.innerWidth < 768 ? 140 : 210) * (characterScale / 2.5)))}px`,
                      top: '8%',
                      height: '90%'
                    }}
                    className="avatar-character-handle absolute left-1/2 -translate-x-1/2 pointer-events-auto cursor-grab active:cursor-grabbing rounded-full z-20 touch-none select-none"
                  />
                )}
              </div>
            </Rnd>

            {/* Classroom Ambience: a warm floor GLOW beneath the avatar box,
                so she reads as standing in a lit spot instead of floating on
                a flat background. NOTE: the first version of this was a dark
                shadow ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â completely invisible, since it's dark-on-an-already-
                near-black background by construction. Flipped to a warm glow
                instead, which actually fits the app's whole dark-theme
                language better anyway (everything else on screen glows;
                nothing casts a literal shadow). Tracks the same position/size
                as the Rnd box above (a sibling, not a child, so it isn't
                clipped by the box's own overflow-hidden) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â only shown in
                PiP-style modes, where "standing in a specific spot" makes sense. */}
            {classroomAmbience && isPiP && (
              <div
                className="absolute pointer-events-none z-[19] transition-all duration-300"
                style={{
                  left: rndBox.position.x - (rndBox.size.width * characterScale) * 0.15,
                  top: rndBox.position.y + rndBox.size.height * characterScale - 30,
                  width: (rndBox.size.width * characterScale) * 1.3,
                  height: 70,
                  background: 'radial-gradient(ellipse 60% 100% at 50% 30%, rgba(251,191,36,0.35) 0%, rgba(251,191,36,0.12) 45%, transparent 75%)'
                }}
              />
            )}
          </>
        );
      })()}



      {/* Lecture Completion Celebration Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-2 border-emerald-400/50 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-[0_20px_70px_rgba(16,185,129,0.35)] relative ring-1 ring-white/10">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 mx-auto flex items-center justify-center mb-4 text-4xl shadow-lg shadow-emerald-500/30 animate-bounce">
              🎉
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-wide flex items-center justify-center gap-2">
              <span className="text-emerald-300 drop-shadow-[0_2px_10px_rgba(52,211,153,0.5)]">Lecture</span>
              <span className="text-teal-200 drop-shadow-[0_2px_10px_rgba(45,212,191,0.5)]">Finished!</span>
            </h3>
            <p className="text-slate-200 text-sm sm:text-base mb-6 leading-relaxed">
              Great job! The lecture on{" "}
              <span className="text-emerald-300 font-bold underline decoration-emerald-500/50 decoration-2">{activeDemoTopic || "the topic"}</span> has ended.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {lastDemoChunksRef.current && lastDemoChunksRef.current.length > 0 && (
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setIsDemoActive(true);
                    isDemoActiveRef.current = true;
                    enqueueChunks(lastDemoChunksRef.current, { replace: true });
                  }}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm sm:text-base transition-all active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <i className="fas fa-rotate-right text-emerald-400"></i>
                  <span>Replay Lecture</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  stopDemoLecture();
                }}
                className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all shadow-xl shadow-emerald-500/30 active:scale-95 hover:scale-105 cursor-pointer"
              >
                Back to Classroom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Bottom-Left Wifi Status Indicator — Only shown when offline */}
      {!isOnline && (
        <div 
          className="fixed bottom-4 left-4 z-[280] flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-xl border border-red-500/80 bg-red-950/95 text-red-200 ring-2 ring-red-500/50 shadow-red-950/60 animate-pulse pointer-events-auto select-none"
          title="No internet connection"
        >
          <span className="text-base sm:text-lg flex items-center justify-center text-red-400">
            📶
          </span>
          <span className="text-[11px] sm:text-xs font-semibold tracking-wide">
            No Connection
          </span>
          <span className="w-2 h-2 rounded-full shrink-0 bg-red-500 animate-ping" />
        </div>
      )}

      {/* Subtitles Overlay */}
      <SubtitlesOverlay subtitles={subtitles} isSpeaking={isRecording && (isSpeaking || isCastSpeaking)} />

      {/* Bottom Proximity Trigger Zone — reveals control bar on cursor drag/hover without clicking */}
      {isActivelyTeaching && !isControlBarVisible && (
        <div 
          className="fixed bottom-0 inset-x-0 h-16 sm:h-20 z-[105] pointer-events-auto bg-transparent cursor-pointer"
          onMouseEnter={showControlBarTemporarily}
          onMouseMove={showControlBarTemporarily}
          onTouchStart={showControlBarTemporarily}
          title="Hover to reveal classroom controls"
        />
      )}

      {/* Control Bar: Desktop generic bar vs Mobile Dedicated Interactive Dock */}
      {isMobileScreen ? (
        <MobileInteractiveDock
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          toggleMic={toggleMic}
          isSignCameraOpen={isSignCameraOpen}
          toggleSignCamera={() => setIsSignCameraOpen(prev => !prev)}
          isWhiteboardOpen={isWhiteboardOpen}
          onToggleBoard={handleToggleBoard}
          onOpenAITools={() => setShowAITools(true)}
          onUploadClick={() => {
            resetAvatarState();
            setIsWhiteboardOpen(false);
            setIsSignCameraOpen(false);
            setShowAITools(false);
            setShowSettings(false);
            if (presentationFileUrl) {
              setPresentationFileUrl(null);
              setPresentationFileType(null);
              setIsScreenshare(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
              fileInputRef.current?.click();
            }
          }}
          visualMode={visualMode}
          onToggleVisualMode={() => setVisualMode(v => v === 'visual' ? 'classroom' : 'visual')}
          onOpenSettings={() => setShowSettings(true)}
          isActivelyTeaching={isActivelyTeaching}
          isDemoActive={isDemoActive}
          onBack={handleGoBack}
          isAutoHidden={isActivelyTeaching && !isControlBarVisible}
          onUserActivity={showControlBarTemporarily}
        />
      ) : (
        <ControlBar 
          isRecording={isRecording}
          isSpeaking={isSpeaking}
          toggleMic={toggleMic}
          isSignCameraOpen={isSignCameraOpen}
          toggleSignCamera={() => setIsSignCameraOpen(prev => !prev)}
          isScreenshare={isScreenshare}
          toggleScreenshare={toggleScreenshare}
          setShowSettings={setShowSettings}
          setShowAITools={setShowAITools}
          onToggleBoard={handleToggleBoard}
          isBoardOpen={isWhiteboardOpen}
          isAutoHidden={isActivelyTeaching && !isControlBarVisible}
          onUserActivity={showControlBarTemporarily}
          onUploadClick={() => {
            resetAvatarState();
            setIsWhiteboardOpen(false);
            setIsSignCameraOpen(false);
            setShowAITools(false);
            setShowSettings(false);
            if (presentationFileUrl) {
              setPresentationFileUrl(null);
              setPresentationFileType(null);
              setIsScreenshare(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
              fileInputRef.current?.click();
            }
          }}
        />
      )}

      {/* Dedicated Clean Playback Bar for Demos & Prompt-to-Sign (Pause/Play, 5s Undo, 5s Redo) */}
      {!isSignCameraOpen && (isDemoActive || playerState.playing || playerState.hasQueue || playerState.hasHistory) && (
        <PlayerControls
          playerState={playerState}
          skipBackward={skipBackward}
          skipForward={skipForward}
          pause={pause}
          resume={resume}
        />
      )}

      {/* Settings Panel */}

      <SettingsPanel 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        teacherName={teacherName}
        setTeacherName={setTeacherName}
        topic={topic}
        setTopic={setTopic}
        avatarName={avatarName}
        setAvatarName={setAvatarName}
        transcriptHistory={transcriptHistory}
        wsTeacherRef={wsTeacherRef}
        sttMode={sttMode}
        setSttMode={setSttMode}
        showAvatarBg={showAvatarBg}
        setShowAvatarBg={setShowAvatarBg}
        targetLanguage={targetLanguage}
        setTargetLanguage={setTargetLanguage}
        targetVoice={targetVoice}
        setTargetVoice={setTargetVoice}
        ttsEnabled={ttsEnabled}
        setTtsEnabled={setTtsEnabled}
        characterScale={characterScale}
        setCharacterScale={setCharacterScale}
        fullSentenceCaptions={fullSentenceCaptions}
        setFullSentenceCaptions={setFullSentenceCaptions}
        classroomAmbience={classroomAmbience}
        setClassroomAmbience={setClassroomAmbience}
      />

      {/* AI Tools Modal */}
      <AIToolsModal
        isOpen={showAITools}
        onClose={() => setShowAITools(false)}
        onProcessSuccess={handleAIToolsSuccess}
        onDemoSelect={handleDemoSelect}
        isVisualAssistEnabled={isVisualAssistEnabled}
        onToggleVisualAssist={toggleVisualAssist}
        targetLanguage={targetLanguage}
        targetVoice={targetVoice}
        ttsEnabled={ttsEnabled}
        avatarName={avatarName}
        onStatusChange={setAiProcessingStatus}
      />

      {/* AI Processing Status ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â stays visible even after the modal auto-closes
          (e.g. document upload), so long backend steps never look like a freeze */}
      {aiProcessingStatus && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[400] flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-2xl">
          <i className="fas fa-circle-notch fa-spin text-purple-400"></i>
          <span className="text-sm font-medium text-white">{aiProcessingStatus}</span>
        </div>
      )}

      {/* Real-Time Camera Sign-to-Speech Detector */}
      <SignCameraDetector
        isOpen={isSignCameraOpen}
        onClose={() => setIsSignCameraOpen(false)}
        onSignDetected={handleSignDetected}
        targetLanguage={targetLanguage}
        ttsEnabled={ttsEnabled}
      />

    </main>
  );
}

















