"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { formatProperSubtitles } from '../lib/subtitleUtils';

export type SttMode = 'vosk' | 'browser';

const LANGUAGE_BCP47_MAP: Record<string, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Marathi: 'mr-IN',
  Malayalam: 'ml-IN',
  Telugu: 'te-IN',
  Kannada: 'kn-IN',
};

/**
 * Phonetic & Contextual Disambiguation for Indian English (en-IN).
 * Corrects common ASR acoustic confusions caused by Indian English pronunciation:
 * e.g., 'working' (/wʌrkɪŋ/) misinterpreted as 'walking' (/wɔːkɪŋ/).
 */
export function correctIndianAccentPhonetics(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let s = text;

  // 1. "walking" vs "working" disambiguation for Indian English accent:
  // - Followed by: properly, fine, well, together, hard, on, in, for, with, again, smoothly, correctly, now, etc.
  s = s.replace(
    /\b(walk|walking|walked|walks)\s+(properly|fine|well|together|hard|on|in|for|with|again|smoothly|correctly|now|offline|online|today|already)\b/gi,
    (match, verb, adverb) => {
      const vLow = verb.toLowerCase();
      let base = 'work';
      if (vLow.endsWith('ing')) base = 'working';
      else if (vLow.endsWith('ed')) base = 'worked';
      else if (vLow.endsWith('s')) base = 'works';
      if (verb[0] === verb[0].toUpperCase()) {
        base = base.charAt(0).toUpperCase() + base.slice(1);
      }
      return `${base} ${adverb}`;
    }
  );

  // - Preceded by non-locomotive subjects / machines / systems / mic / code / software:
  s = s.replace(
    /\b(it|this|that|mic|microphone|code|laptop|mobile|phone|system|app|website|model|board|screen|camera|tool|feature|project|program|method|function|device|audio|video|sound|everything|thing)\s+(is|was|will|are|were|can|cannot|can't|does|doesn't|not|has|had)?\s*(not)?\s*(walk|walking|walked|walks)\b/gi,
    (match, subj, aux, neg, verb) => {
      const vLow = verb.toLowerCase();
      let base = 'working';
      if (vLow === 'walk') base = 'work';
      else if (vLow === 'walked') base = 'worked';
      else if (vLow === 'walks') base = 'works';
      const parts = [subj, aux, neg, base].filter(Boolean);
      return parts.join(' ');
    }
  );

  // - Auxiliary / passive contexts: "is walking", "was walking", "are walking", "were walking", "been walking" -> "is working"
  s = s.replace(/\b(is|was|are|were|been)\s+(walking)\b/gi, '$1 working');
  s = s.replace(/\b(not|cannot|can't|won't)\s+(walk|walking)\b/gi, (match, p1, p2) => {
    return `${p1} ${p2.toLowerCase() === 'walking' ? 'working' : 'work'}`;
  });
  s = s.replace(/\bhard\s+walking\b/gi, 'hard working');

  // 2. "tree" vs "three" in counting / academic context:
  s = s.replace(
    /\btree\s+(types|laws|steps|parts|categories|dimensions|methods|points|examples|phases|variables|equations|questions|times)\b/gi,
    'three $1'
  );

  // 3. "tin" vs "thin" in science / physics / math context:
  s = s.replace(
    /\btin\s+(layer|lens|sheet|wire|film|line|surface|plate|slit)\b/gi,
    'thin $1'
  );

  // 4. "wery" -> "very"
  s = s.replace(/\bwery\b/gi, 'very');

  // 5. "simble" -> "symbol"
  s = s.replace(/\bsimble\b/gi, 'symbol');

  // 6. "taught" vs "thought" in reflective context:
  s = s.replace(/\bi\s+taught\s+(that|about|it|you|this|so)\b/gi, 'I thought $1');

  return s;
}

export function useSpeechRecognition(
  wsTeacherRef: React.MutableRefObject<WebSocket | null>,
  targetLanguage: string = "English",
  explicitSessionId?: string,
  onSubtitles?: (text: string, isFinal?: boolean) => void
) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("System Ready");
  const [statusColor, setStatusColor] = useState("#10b981");
  const [sttMode, setSttModeState] = useState<SttMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('signova_stt_mode') as SttMode;
      if (saved === 'vosk' || saved === 'browser') return saved;
    }
    return 'browser';
  });

  const recognition = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const speakingDecayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sttModeRef = useRef<SttMode>('browser');
  const targetLanguageRef = useRef(targetLanguage);
  targetLanguageRef.current = targetLanguage;
  const explicitSessionIdRef = useRef(explicitSessionId);
  explicitSessionIdRef.current = explicitSessionId;
  const onSubtitlesRef = useRef(onSubtitles);
  onSubtitlesRef.current = onSubtitles;

  // Streaming word tracking so avatar signs continuously while the user is speaking fluently
  const streamedWordCountRef = useRef<number>(0);
  const lastStreamTimestampRef = useRef<number>(Date.now());
  // Rolling history of recent utterances sent within the last 1.8 seconds to eliminate duplicate speech glitches
  const recentUtterancesRef = useRef<{ text: string; time: number }[]>([]);

  const getSessionId = () => {
    if (explicitSessionIdRef.current && explicitSessionIdRef.current.trim() && explicitSessionIdRef.current !== 'default') {
      return explicitSessionIdRef.current.trim();
    }
    if (typeof window === 'undefined') return 'default';
    try {
      const params = new URLSearchParams(window.location.search);
      const queryRoom = params.get('room') || params.get('session');
      if (queryRoom && queryRoom.trim()) {
        return queryRoom.trim();
      }

      return sessionStorage.getItem('signova_session_id') || localStorage.getItem('signova_session_id') || 'default';
    } catch (e) {
      return 'default';
    }
  };

  const isDuplicateUtterance = (newText: string): boolean => {
    const clean = (s: string) => s.toLowerCase().replace(/[\s.,/#!$%^&*;:{}=\-_`~()?'"!\n।]+/g, "").trim();
    const normNew = clean(newText);
    if (!normNew || normNew.length < 2) return true;
    
    const now = Date.now();
    // Prune history older than 1800ms
    recentUtterancesRef.current = recentUtterancesRef.current.filter(u => now - u.time < 1800);

    for (const u of recentUtterancesRef.current) {
      const normOld = clean(u.text);
      if (normNew === normOld) return true;
    }
    // Record this utterance
    recentUtterancesRef.current.push({ text: newText, time: now });
    return false;
  };

  // Sync sttMode state and ref, persisting to localStorage
  const setSttMode = useCallback((mode: SttMode) => {
    sttModeRef.current = mode;
    setSttModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('signova_stt_mode', mode);
    }
  }, []);

  // Audio Visualizer & Vosk Streaming Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const muteGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const visualizerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const visualizerStreamRef = useRef<MediaStream | null>(null);
  const lastSpokenTimeRef = useRef<number>(Date.now());
  const hadSoundRef = useRef<boolean>(false);
  const mobileAnimIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile device accurately (Android, iOS, iPadOS, touch devices)
  const isMobile = useCallback((): boolean => {
    if (typeof navigator === 'undefined') return false;
    return Boolean(
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth < 768) ||
      ((navigator.maxTouchPoints ?? 0) > 1 && /Macintosh/i.test(navigator.userAgent))
    );
  }, []);

  // Downsampler to convert native hardware sample rates (44100Hz, 48000Hz on mobile) to 16000Hz for Vosk/Whisper
  const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number = 16000): Int16Array => {
    if (inputRate === outputRate) {
      const pcm = new Int16Array(buffer.length);
      for (let i = 0; i < buffer.length; i++) {
        pcm[i] = Math.max(-1, Math.min(1, buffer[i])) * 0x7FFF;
      }
      return pcm;
    }
    const ratio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Int16Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      const sample = count > 0 ? accum / count : (buffer[offsetBuffer] || 0);
      result[offsetResult] = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  // Synthesized visualizer pulse on mobile (when getUserMedia is deferred to avoid Android/iOS hardware lock)
  const pulseMobileVisualizer = useCallback((speaking: boolean) => {
    if (speaking) {
      visualizerRefs.current.forEach((ref, index) => {
        if (ref) {
          const randomScale = 1.2 + Math.random() * (0.8 + index * 0.3);
          ref.style.transform = `scale(${randomScale})`;
        }
      });
    } else {
      visualizerRefs.current.forEach((ref) => {
        if (ref) ref.style.transform = `scale(1)`;
      });
    }
  }, []);

  const startMobilePulseLoop = useCallback(() => {
    if (mobileAnimIntervalRef.current) clearInterval(mobileAnimIntervalRef.current);
    mobileAnimIntervalRef.current = setInterval(() => {
      if (isSpeakingRef.current) {
        pulseMobileVisualizer(true);
      } else {
        pulseMobileVisualizer(false);
      }
    }, 120);
  }, [pulseMobileVisualizer]);

  const stopMobilePulseLoop = useCallback(() => {
    if (mobileAnimIntervalRef.current) {
      clearInterval(mobileAnimIntervalRef.current);
      mobileAnimIntervalRef.current = null;
    }
    pulseMobileVisualizer(false);
  }, [pulseMobileVisualizer]);

  // --- AUDIO VISUALIZER & COCHLEAR ACOUSTIC CHAOS FILTER ---
  const startVisualizer = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        console.warn("[Audio] getUserMedia not available in this environment.");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          } 
        });
      } catch (err) {
        console.info("[Audio] Retrying with basic audio constraints for mobile:", err);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      visualizerStreamRef.current = stream;
      
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        console.warn("[Audio] AudioContext not available.");
        return;
      }

      let audioCtx: AudioContext;
      try {
        audioCtx = new AudioCtxClass({ sampleRate: 16000 });
      } catch (e) {
        audioCtx = new AudioCtxClass();
      }
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn("[Audio] audioCtx.resume error:", e);
        }
      }
      
      const source = audioCtx.createMediaStreamSource(stream);

      // --- COCHLEAR ACOUSTIC FILTER CHAIN ---
      // 1. Highpass filter @ 85Hz: eliminates air conditioning rumble & low-end floor thuds
      const highPassFilter = audioCtx.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 85;

      // 2. Speech Peaking filter @ 2200Hz (+3dB): amplifies human voice formants above background noise
      const speechPeaking = audioCtx.createBiquadFilter();
      speechPeaking.type = "peaking";
      speechPeaking.frequency.value = 2200;
      speechPeaking.Q.value = 1.2;
      speechPeaking.gain.value = 3.0;

      // 3. Lowpass filter @ 7500Hz: preserves all speech consonants, sibilants, and fricatives up to 7.5kHz while eliminating ultrasonic hiss
      const lowPassFilter = audioCtx.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 7500;

      // 4. Dynamics Compressor: levels out loud bangs, coughs and clatter
      const compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Connect Cochlear Filter Chain: source -> highpass -> peaking -> lowpass -> compressor
      source.connect(highPassFilter);
      highPassFilter.connect(speechPeaking);
      speechPeaking.connect(lowPassFilter);
      lowPassFilter.connect(compressor);

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      compressor.connect(analyser);
      analyserRef.current = analyser;

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      compressor.connect(processor);
      
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      processor.connect(muteGain);
      muteGain.connect(audioCtx.destination);
      processorRef.current = processor;
      muteGainRef.current = muteGain;

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;

        if (sttModeRef.current === 'vosk') {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16 = downsampleBuffer(inputData, audioCtx.sampleRate, 16000);
          if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
            wsTeacherRef.current.send(pcm16.buffer);
          }
        }
      };

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Voice Activity Detection with sensitive noise-floor threshold
        if (average > 6) {
          lastSpokenTimeRef.current = Date.now();
          hadSoundRef.current = true;
          
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            setIsSpeaking(true);
          }
          if (speakingDecayTimerRef.current) {
            clearTimeout(speakingDecayTimerRef.current);
          }
          speakingDecayTimerRef.current = setTimeout(() => {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
          }, 350);
        } else {
          const silenceDuration = Date.now() - lastSpokenTimeRef.current;
          if (sttModeRef.current === 'vosk' && hadSoundRef.current && silenceDuration > 1400) {
            hadSoundRef.current = false;
            if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
              wsTeacherRef.current.send(JSON.stringify({ type: "flush", session_id: getSessionId() }));
            }
          }
        }

        const normalized = Math.min(average / 100, 1);
        visualizerRefs.current.forEach((ref, index) => {
          if (ref) {
            const scale = 1 + (normalized * (0.5 + index * 0.4));
            ref.style.transform = `scale(${scale})`;
          }
        });

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (err: any) {
      console.warn("Could not start visualizer stream:", err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      if (isDenied) {
        setStatusText("Mic Permission Denied");
        setStatusColor("#ef4444");
        setIsRecording(false);
        isRecordingRef.current = false;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    }
  };

  const stopVisualizer = () => {
    stopMobilePulseLoop();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (speakingDecayTimerRef.current) clearTimeout(speakingDecayTimerRef.current);
    setIsSpeaking(false);
    isSpeakingRef.current = false;

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (muteGainRef.current) {
      muteGainRef.current.disconnect();
      muteGainRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (visualizerStreamRef.current) {
      visualizerStreamRef.current.getTracks().forEach(track => track.stop());
      visualizerStreamRef.current = null;
    }
    visualizerRefs.current.forEach((ref) => {
      if (ref) ref.style.transform = `scale(1)`;
    });
  };

  // --- FACTORY FOR SPEECH RECOGNITION INSTANCE ---
  const createRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.info("[STT] Browser SpeechRecognition unavailable on this device.");
      return null;
    }

    const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    let rec: any;
    try {
      rec = new SpeechRecognition();
    } catch (e) {
      console.warn("[STT] SpeechRecognition constructor failed:", e);
      return null;
    }

    rec.continuous = !isIOS;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = LANGUAGE_BCP47_MAP[targetLanguageRef.current] || 'en-IN';

    // Boost Indian English educational terms and phonetics via SpeechGrammarList if supported
    const SpeechGrammarListClass = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (SpeechGrammarListClass) {
      try {
        const grammarList = new SpeechGrammarListClass();
        const grammar = '#JSGF V1.0; grammar indian_english; public <term> = working | work | works | classroom | teacher | students | signova | physics | mathematics | science | formula | method | chapter ;';
        grammarList.addFromString(grammar, 1);
        rec.grammars = grammarList;
      } catch (e) {}
    }

    const isNoiseArtifact = (text: string) => {
      const t = text.trim().toLowerCase();
      return /^(uh|um|er|ah|eh|mm|hm|shh|psst|[a-z])$/i.test(t);
    };

    rec.onstart = () => {
      isRecognizingRef.current = true;
      console.log(`[STT] SpeechRecognition started listening (lang: ${rec.lang}, continuous: ${rec.continuous})`);
    };

    rec.onaudiostart = () => {
      console.log("[STT] Mobile audio capture active");
      setStatusText("Listening...");
      setStatusColor("#a855f7");
    };

    rec.onsoundstart = () => {
      if (isMobile()) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        pulseMobileVisualizer(true);
      }
    };

    rec.onspeechstart = () => {
      if (isMobile()) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        pulseMobileVisualizer(true);
      }
    };

    rec.onsoundend = () => {
      if (isMobile()) {
        if (speakingDecayTimerRef.current) clearTimeout(speakingDecayTimerRef.current);
        speakingDecayTimerRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          pulseMobileVisualizer(false);
        }, 350);
      }
    };

    rec.onspeechend = () => {
      if (isMobile()) {
        if (speakingDecayTimerRef.current) clearTimeout(speakingDecayTimerRef.current);
        speakingDecayTimerRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          pulseMobileVisualizer(false);
        }, 350);
      }
    };

    rec.onresult = (event: any) => {
      if (!isSpeakingRef.current) {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        if (isMobile()) pulseMobileVisualizer(true);
        if (speakingDecayTimerRef.current) clearTimeout(speakingDecayTimerRef.current);
        speakingDecayTimerRef.current = setTimeout(() => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          if (isMobile()) pulseMobileVisualizer(false);
        }, 350);
      }

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (!res || !res[0]) continue;
        const isFinal = res.isFinal;
        const rawTranscript = (res[0].transcript || "").trim();
        if (!rawTranscript || isNoiseArtifact(rawTranscript)) continue;
        
        // Disambiguate Indian accent phonetics and format proper subtitles with punctuation and capitalization
        const transcript = correctIndianAccentPhonetics(rawTranscript);
        const formatted = formatProperSubtitles(transcript, isFinal);
        
        // Immediate zero-latency local subtitle display
        if (onSubtitlesRef.current && formatted) {
          onSubtitlesRef.current(formatted, isFinal);
        }

        const words = transcript.split(/\s+/).filter(Boolean);
        const curSessId = getSessionId();

        if (isFinal) {
          const remainingWords = words.slice(streamedWordCountRef.current);
          streamedWordCountRef.current = 0;
          
          const textToSend = remainingWords.join(" ").trim();
          const formattedRemainder = formatProperSubtitles(textToSend, true);
          if (textToSend && !isNoiseArtifact(textToSend) && !isDuplicateUtterance(textToSend)) {
            console.log("[STT] Sending final remainder:", formattedRemainder, "Lang:", targetLanguageRef.current, "Sess:", curSessId);
            if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
              wsTeacherRef.current.send(JSON.stringify({ 
                type: "text", 
                isFinal: true, 
                payload: formattedRemainder,
                language: targetLanguageRef.current,
                session_id: curSessId
              }));
            }
          }
          if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
            wsTeacherRef.current.send(JSON.stringify({ 
              type: "text", 
              isFinal: true, 
              payload: formatted || transcript,
              language: targetLanguageRef.current,
              session_id: curSessId
            }));
          }
        } else {
          if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
            wsTeacherRef.current.send(JSON.stringify({ 
              type: "text", 
              isFinal: false, 
              payload: formatted || transcript,
              language: targetLanguageRef.current,
              session_id: curSessId
            }));
          }

          const newWordsCount = words.length - streamedWordCountRef.current;
          const timeSinceLastStream = Date.now() - lastStreamTimestampRef.current;
          
          if (newWordsCount >= 3 || (newWordsCount >= 2 && timeSinceLastStream > 1100)) {
            const chunkWords = words.slice(streamedWordCountRef.current, streamedWordCountRef.current + newWordsCount);
            const chunkText = chunkWords.join(" ").trim();
            streamedWordCountRef.current = words.length;
            lastStreamTimestampRef.current = Date.now();

            if (chunkText && !isNoiseArtifact(chunkText) && !isDuplicateUtterance(chunkText)) {
              console.log("[STT] Streaming fluent speech chunk to avatar:", chunkText, "Sess:", curSessId);
              if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
                wsTeacherRef.current.send(JSON.stringify({ 
                  type: "text", 
                  isFinal: true, 
                  payload: chunkText,
                  language: targetLanguageRef.current,
                  session_id: curSessId
                }));
              }
            }
          }
        }
      }
    };

    rec.onerror = (e: any) => {
      console.warn("[STT] Speech recognition error:", e.error);
      if (e.error === 'no-speech' || e.error === 'aborted') {
        return;
      }
      if (e.error === 'network') {
        if (isRecordingRef.current) {
          setTimeout(() => {
            if (isRecordingRef.current && !isRecognizingRef.current) {
              try { rec.start(); isRecognizingRef.current = true; } catch(_) {}
            }
          }, 600);
        }
        return;
      }
      // On mobile devices, if speech recognition encounters audio-capture or service block, fallback to WebSocket audio streaming
      if (e.error === 'audio-capture' || e.error === 'service-not-allowed') {
        console.info("[STT] SpeechRecognition audio-capture error on mobile. Falling back to WebSocket Audio Streaming (Vosk/Whisper)...");
        setSttMode('vosk');
        startVisualizer();
        return;
      }
      if (e.error === 'not-allowed') {
        isRecordingRef.current = false;
        setIsRecording(false);
        setStatusText("Mic Denied");
        setStatusColor("#ef4444");
        stopVisualizer();
        stopMobilePulseLoop();
      }
    };

    rec.onend = () => {
      isRecognizingRef.current = false;
      console.log("[STT] SpeechRecognition session ended.");
      
      if (isRecordingRef.current && sttModeRef.current === 'browser') {
        setTimeout(() => {
          if (isRecordingRef.current && !isRecognizingRef.current) {
            try {
              rec.lang = LANGUAGE_BCP47_MAP[targetLanguageRef.current] || 'en-IN';
              rec.start();
              isRecognizingRef.current = true;
            } catch (err: any) {
              if (err?.name === 'InvalidStateError') {
                isRecognizingRef.current = true;
                return;
              }
              console.warn("[STT] Auto-restart attempt:", err);
              if (isRecordingRef.current) {
                const fresh = createRecognition();
                if (fresh) {
                  recognition.current = fresh;
                  try { fresh.start(); isRecognizingRef.current = true; } catch(_) {}
                }
              }
            }
          }
        }, isIOS ? 150 : 60);
      }
    };

    return rec;
  }, [wsTeacherRef, isMobile, pulseMobileVisualizer, setSttMode]);

  // Initial setup of speech recognition
  useEffect(() => {
    const rec = createRecognition();
    if (rec) {
      recognition.current = rec;
    } else {
      setSttMode('vosk');
    }

    return () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.onerror = null;
        recognition.current.onresult = null;
        try { recognition.current.stop(); } catch(e) {}
      }
    };
  }, [createRecognition, setSttMode]);

  // Language switching
  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
    const newLang = LANGUAGE_BCP47_MAP[targetLanguage] || 'en-IN';
    console.log(`[STT] Language switched to ${targetLanguage} (${newLang})`);

    if (recognition.current && isRecognizingRef.current) {
      try {
        recognition.current.stop();
      } catch (e) {
        console.warn("[STT] Stop on language switch error:", e);
      }
    } else if (recognition.current && isRecordingRef.current && !isRecognizingRef.current && sttModeRef.current === 'browser') {
      try {
        recognition.current.lang = newLang;
        recognition.current.start();
        isRecognizingRef.current = true;
      } catch (e) {
        const fresh = createRecognition();
        if (fresh) {
          recognition.current = fresh;
          try { fresh.start(); isRecognizingRef.current = true; } catch(_) {}
        }
      }
    }
  }, [targetLanguage, createRecognition]);

  const startMic = useCallback(() => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    setIsRecording(true);
    setStatusText("Listening...");
    setStatusColor("#a855f7");
    
    const onMobile = isMobile();

    // On desktop or when in 'vosk' mode, start the WebAudio Cochlear visualizer & PCM capture
    if (!onMobile || sttModeRef.current === 'vosk') {
      startVisualizer();
    } else {
      // On mobile in browser STT mode:
      // DO NOT open getUserMedia simultaneously because mobile OS (Android HAL / iOS CoreAudio)
      // locks the mic hardware exclusively, preventing webkitSpeechRecognition from receiving voice!
      startMobilePulseLoop();
    }
    
    // 2. Start browser speech recognition if in browser mode
    if (sttModeRef.current === 'browser') {
      if (!recognition.current) {
        recognition.current = createRecognition();
      }

      if (recognition.current && !isRecognizingRef.current) {
        try { 
          recognition.current.lang = LANGUAGE_BCP47_MAP[targetLanguageRef.current] || 'en-IN';
          recognition.current.start(); 
          isRecognizingRef.current = true;
        } catch(e: any) {
          if (e?.name === 'InvalidStateError') {
            isRecognizingRef.current = true;
          } else {
            console.warn("[STT] startMic start error, recreating:", e);
            const fresh = createRecognition();
            if (fresh) {
              recognition.current = fresh;
              try { fresh.start(); isRecognizingRef.current = true; } catch(_) {}
            }
          }
        }
      }
    }
  }, [startVisualizer, createRecognition, isMobile, startMobilePulseLoop]);

  const stopMic = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    setStatusText("System Ready");
    setStatusColor("#10b981");
    
    if (sttModeRef.current === 'vosk' && wsTeacherRef.current?.readyState === WebSocket.OPEN) {
      wsTeacherRef.current.send(JSON.stringify({ type: "flush", session_id: getSessionId() }));
    }
    
    stopVisualizer();
    stopMobilePulseLoop();
    if (recognition.current && isRecognizingRef.current) {
      try { recognition.current.stop(); } catch(e) {}
    }
  }, [wsTeacherRef, stopMobilePulseLoop]);

  const toggleMic = useCallback(() => {
    if (isRecordingRef.current) {
      stopMic();
    } else {
      startMic();
    }
  }, [startMic, stopMic]);

  return {
    isRecording,
    isSpeaking,
    startMic,
    stopMic,
    toggleMic,
    statusText,
    statusColor,
    visualizerRefs,
    sttMode,
    setSttMode
  };
}
