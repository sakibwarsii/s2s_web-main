"use client";

import React, { useState } from 'react';
import { getAvatarGender, getVoiceForLanguage, type Gender } from '../lib/voiceGender';

interface AIToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessSuccess: (chunks: any[], options?: { replace?: boolean }) => void;
  /** Quick Demos use this instead of onProcessSuccess — it REPLACES whatever's
   *  currently playing instead of queuing behind it, so clicking a new demo
   *  takes over immediately without needing a refresh. */
  onDemoSelect: (chunks: {text: string, sigml: string[], visual_url?: string, visual_keyword?: string, visual_source?: string}[], title?: string) => void;
  isVisualAssistEnabled: boolean;
  onToggleVisualAssist: () => void;
  targetLanguage: string;
  targetVoice: string;
  ttsEnabled: boolean;
  /** Current avatar — Quick Demos auto-pick the male/female voice file
   *  matching this avatar's gender per language, same as the live pipeline. */
  avatarName: string;
  /** Reports progress text even after the modal itself closes (e.g. document upload),
   *  so the user sees *something* moving instead of the page looking frozen.
   *  Called with null when processing finishes or errors out. */
  onStatusChange?: (status: string | null) => void;
}

// Pre-baked demo payloads — the AI processing (script generation, translation,
// sign-gloss lookup, TTS synthesis, visual fetch) already happened once ahead
// of time; each file is just the finished chunk array. Clicking a demo button
// is a local JSON fetch, not a live pipeline run — instant playback with zero
// dependency on Groq/TTS/network working perfectly in front of an audience.
//
// A topic can have multiple LANGUAGES, each with up to two GENDER variants
// that all share the exact same sign gloss + visuals (only the audio/subtitle
// differs) — built with server/generate_multilang_demo.py (first language per
// topic) and server/add_male_variants.py / add_hindi_variant.py (added
// languages/genders reusing the same visuals). Buttons are per-LANGUAGE only;
// which gender file actually loads follows the currently selected avatar
// automatically, same as the live translation pipeline.
interface LangFiles {
  female: string;
  /** Absent where no male voice model exists yet (currently just Marathi) —
   *  falls back to the female file in that case. */
  male?: string;
}
interface DemoTopic { id: string; icon: string; title: string; languages: Record<string, LangFiles>; }

const QUICK_DEMOS: DemoTopic[] = [
  {
    id: "photosynthesis", icon: "🌱", title: "Photosynthesis",
    languages: {
      English: { female: "/demo_samples/photosynthesis_en.json", male: "/demo_samples/photosynthesis_en_male.json" },
      Hindi: { female: "/demo_samples/photosynthesis_hi.json", male: "/demo_samples/photosynthesis_hi_male.json" },
      Marathi: { female: "/demo_samples/photosynthesis_mr.json", male: "/demo_samples/photosynthesis_mr_male.json" },
      Malayalam: { female: "/demo_samples/photosynthesis_ml.json", male: "/demo_samples/photosynthesis_ml_male.json" },
      Telugu: { female: "/demo_samples/photosynthesis_te.json", male: "/demo_samples/photosynthesis_te_male.json" },
      Kannada: { female: "/demo_samples/photosynthesis_kn.json", male: "/demo_samples/photosynthesis_kn_male.json" },
    }
  },
  {
    id: "ohms_law", icon: "⚡", title: "Ohm's Law",
    languages: {
      English: { female: "/demo_samples/ohms_law_en.json", male: "/demo_samples/ohms_law_en_male.json" },
      Hindi: { female: "/demo_samples/ohms_law_hi.json", male: "/demo_samples/ohms_law_hi_male.json" },
      Marathi: { female: "/demo_samples/ohms_law_mr.json", male: "/demo_samples/ohms_law_mr_male.json" },
      Malayalam: { female: "/demo_samples/ohms_law_ml.json", male: "/demo_samples/ohms_law_ml_male.json" },
      Telugu: { female: "/demo_samples/ohms_law_te.json", male: "/demo_samples/ohms_law_te_male.json" },
      Kannada: { female: "/demo_samples/ohms_law_kn.json", male: "/demo_samples/ohms_law_kn_male.json" },
    }
  },
  {
    id: "thirsty_crow", icon: "🐦", title: "The Thirsty Crow — Class 4 story",
    languages: {
      English: { female: "/demo_samples/thirsty_crow_en.json", male: "/demo_samples/thirsty_crow_en_male.json" },
      Hindi: { female: "/demo_samples/thirsty_crow_hi.json", male: "/demo_samples/thirsty_crow_hi_male.json" },
      Marathi: { female: "/demo_samples/thirsty_crow_mr.json", male: "/demo_samples/thirsty_crow_mr_male.json" },
      Malayalam: { female: "/demo_samples/thirsty_crow_ml.json", male: "/demo_samples/thirsty_crow_ml_male.json" },
      Telugu: { female: "/demo_samples/thirsty_crow_te.json", male: "/demo_samples/thirsty_crow_te_male.json" },
      Kannada: { female: "/demo_samples/thirsty_crow_kn.json", male: "/demo_samples/thirsty_crow_kn_male.json" },
    }
  },
  {
    id: "profit_and_loss", icon: "🏪", title: "Profit and Loss",
    languages: {
      English: { female: "/demo_samples/profit_and_loss_en.json", male: "/demo_samples/profit_and_loss_en_male.json" },
      Hindi: { female: "/demo_samples/profit_and_loss_hi.json", male: "/demo_samples/profit_and_loss_hi_male.json" },
      Marathi: { female: "/demo_samples/profit_and_loss_mr.json", male: "/demo_samples/profit_and_loss_mr_male.json" },
      Malayalam: { female: "/demo_samples/profit_and_loss_ml.json", male: "/demo_samples/profit_and_loss_ml_male.json" },
      Telugu: { female: "/demo_samples/profit_and_loss_te.json", male: "/demo_samples/profit_and_loss_te_male.json" },
      Kannada: { female: "/demo_samples/profit_and_loss_kn.json", male: "/demo_samples/profit_and_loss_kn_male.json" },
    }
  },
  {
    id: "supply_and_demand", icon: "🍪", title: "Supply and Demand",
    languages: {
      English: { female: "/demo_samples/supply_and_demand_en.json", male: "/demo_samples/supply_and_demand_en_male.json" },
      Hindi: { female: "/demo_samples/supply_and_demand_hi.json", male: "/demo_samples/supply_and_demand_hi_male.json" },
      Marathi: { female: "/demo_samples/supply_and_demand_mr.json", male: "/demo_samples/supply_and_demand_mr_male.json" },
      Malayalam: { female: "/demo_samples/supply_and_demand_ml.json", male: "/demo_samples/supply_and_demand_ml_male.json" },
      Telugu: { female: "/demo_samples/supply_and_demand_te.json", male: "/demo_samples/supply_and_demand_te_male.json" },
      Kannada: { female: "/demo_samples/supply_and_demand_kn.json", male: "/demo_samples/supply_and_demand_kn_male.json" },
    }
  },
  {
    id: "indus_valley", icon: "🏛️", title: "Indus Valley Civilisation",
    languages: {
      English: { female: "/demo_samples/indus_valley_en.json", male: "/demo_samples/indus_valley_en_male.json" },
      Hindi: { female: "/demo_samples/indus_valley_hi.json", male: "/demo_samples/indus_valley_hi_male.json" },
      Marathi: { female: "/demo_samples/indus_valley_mr.json", male: "/demo_samples/indus_valley_mr_male.json" },
      Malayalam: { female: "/demo_samples/indus_valley_ml.json", male: "/demo_samples/indus_valley_ml_male.json" },
      Telugu: { female: "/demo_samples/indus_valley_te.json", male: "/demo_samples/indus_valley_te_male.json" },
      Kannada: { female: "/demo_samples/indus_valley_kn.json", male: "/demo_samples/indus_valley_kn_male.json" },
    }
  },
];

export default function AIToolsModal({
  isOpen,
  onClose,
  onProcessSuccess,
  onDemoSelect,
  isVisualAssistEnabled,
  onToggleVisualAssist,
  targetLanguage,
  targetVoice,
  ttsEnabled,
  avatarName,
  onStatusChange
}: AIToolsModalProps) {
  const [activeTab, setActiveTab] = useState<'demo' | 'batch' | 'prompt' | 'upload'>('demo');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [demoLoadingId, setDemoLoadingId] = useState<string | null>(null);
  const currentGender: Gender = getAvatarGender(avatarName);
  
  const [batchText, setBatchText] = useState("");
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const visualParam = isVisualAssistEnabled ? 'visuals=true' : 'visuals=false';
  const effectiveVoice = getVoiceForLanguage(targetLanguage, currentGender) || targetVoice || 'en-US-AriaNeural';
  const langParam = `lang=${encodeURIComponent(targetLanguage)}`;
  const voiceParam = `voice=${encodeURIComponent(effectiveVoice)}`;
  // AI Tools (Prompt to Sign, Batch, Upload) ALWAYS generate audio/sound so the avatar speaks out loud
  const ttsParam = 'tts=true';
  const queryParams = `?${visualParam}&${langParam}&${voiceParam}&${ttsParam}`;

  if (!isOpen) return null;

  const handleStreamResponse = async (res: Response, onSuccess: (chunks: any[]) => void) => {
    if (!res.body) throw new Error("No response body");
      
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    let done = false;
    let buffer = "";
    
    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      
      if (value) {
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() || "";
        
        for (const part of parts) {
          if (part.trim()) {
            try {
              const chunkData = JSON.parse(part);
              if (chunkData.error) {
                  console.error("Error from backend:", chunkData.error);
                  alert("Error: " + chunkData.error);
              } else if (chunkData.status) {
                  setLoadingStatus(chunkData.status);
                  onStatusChange?.(chunkData.status);
              } else if (chunkData.chunks) {
                  onSuccess(chunkData.chunks);
              } else if (chunkData.text && chunkData.sigml) {
                  // Fallback for upload-document which yields chunks one-by-one
                  onSuccess([chunkData]); 
              }
            } catch (err) {
              console.error("Failed to parse chunk:", part, err);
            }
          }
        }
      }
    }
  };

  const handleBatchSubmit = async () => {
    if (!batchText.trim()) return;
    setIsLoading(true);
    setLoadingStatus("Starting...");
    try {
      const res = await fetch(`/api/batch-text${queryParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batchText })
      });
      await handleStreamResponse(res, (chunks) => {
        onProcessSuccess(chunks, { replace: true });
        setBatchText("");
        onClose();
      });
    } catch (e) {
      console.error(e);
      alert("Failed to process batch text.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
      onStatusChange?.(null);
    }
  };

  const handleDemoClick = async (demoId: string, title: string, language: string, files: LangFiles) => {
    // Follow the current avatar's gender automatically — falls back to the
    // female file if no male variant exists yet for this language (currently
    // just Marathi, which only has one Piper voice model).
    const file = (currentGender === 'male' && files.male) ? files.male : files.female;
    const loadKey = `${demoId}:${language}`;
    setDemoLoadingId(loadKey);
    try {
      const res = await fetch(file);
      const chunks = await res.json();
      // Preload all visuals for instant zero-latency transitions
      if (Array.isArray(chunks)) {
        chunks.forEach((c: any) => {
          if (c.visual_url && typeof window !== 'undefined') {
            const img = new Image();
            img.src = c.visual_url;
          }
        });
      }
      onDemoSelect(chunks, title);
      onClose();
    } catch (e) {
      console.error("Quick demo failed to load:", e);
      alert(`Could not load "${title}" (${language}). Check that ${file} exists in web/public/demo_samples/.`);
    } finally {
      setDemoLoadingId(null);
    }
  };

  const handlePromptSubmit = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setLoadingStatus("Starting...");
    try {
      const res = await fetch(`/api/prompt-to-sign${queryParams}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, instructions })
      });
      await handleStreamResponse(res, (chunks) => {
        onProcessSuccess(chunks, { replace: true });
        setTopic("");
        setInstructions("");
        onClose();
      });
    } catch (e) {
      console.error(e);
      alert("Failed to generate AI prompt.");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
      onStatusChange?.(null);
    }
  };

  const handleUploadSubmit = async () => {
    if (!file) return;
    setIsLoading(true);

    // We can close the modal immediately so the user sees the avatar start signing —
    // but the backend doesn't emit status messages for this endpoint (it streams
    // chunks directly), and extracting + summarizing the document before the first
    // chunk arrives can take several seconds. Without a visible status, that gap
    // reads as the page having frozen. Show one until the first chunk lands.
    onStatusChange?.("Analyzing document...");
    onClose();

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/upload-document${queryParams}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let buffer = "";
      let receivedFirstChunk = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          // Split by newline since backend sends jsonl (\n delimited)
          const parts = buffer.split('\n');
          buffer = parts.pop() || ""; // Keep the last incomplete part in the buffer

          for (const part of parts) {
            if (part.trim()) {
              try {
                const chunkData = JSON.parse(part);
                if (chunkData.error) {
                    console.error("Error from backend:", chunkData.error);
                    onStatusChange?.(null);
                } else if (chunkData.text && chunkData.sigml) {
                    // Send chunk to avatar dynamically
                    onProcessSuccess([chunkData], { replace: false });
                    if (!receivedFirstChunk) {
                      receivedFirstChunk = true;
                      onStatusChange?.(null); // Avatar is now visibly signing — status no longer needed
                    }
                }
              } catch (err) {
                console.error("Failed to parse chunk:", part, err);
              }
            }
          }
        }
      }
      setFile(null);
    } catch (e) {
      console.error(e);
      alert("Failed to upload and stream document.");
    } finally {
      setIsLoading(false);
      onStatusChange?.(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-3">
      <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-3xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-4 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        
        <div className="flex justify-between items-center mb-6 gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white">AI Generation Tools</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Visual Assist Beta Toggle */}
            <button
              onClick={onToggleVisualAssist}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all ${
                isVisualAssistEnabled
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
              title="Visual Assist: shows supporting images alongside signs"
            >
              🖼️ Visual
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                isVisualAssistEnabled ? 'bg-amber-500/30 text-amber-300' : 'bg-white/10 text-slate-600'
              }`}>β</span>
              <span className={`w-6 sm:w-7 h-3.5 sm:h-4 rounded-full relative transition-all ${
                isVisualAssistEnabled ? 'bg-amber-500' : 'bg-white/20'
              }`}>
                <span className={`absolute top-0.5 w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-white transition-all ${
                  isVisualAssistEnabled ? 'left-3 sm:left-3.5' : 'left-0.5'
                }`} />
              </span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <i className="fas fa-times text-xl sm:text-2xl"></i>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:gap-2 gap-1.5 mb-6">
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-colors text-center ${activeTab === 'demo' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            ⚡ Quick Demo
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-colors text-center ${activeTab === 'batch' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Batch Text
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-colors text-center ${activeTab === 'prompt' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Prompt to Sign
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2 sm:py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm transition-colors text-center ${activeTab === 'upload' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
          >
            Upload Doc
          </button>
        </div>

        {activeTab === 'demo' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 -mt-1 mb-1">
              Pre-generated — plays instantly, no waiting for AI processing.
              Voice gender follows your current avatar ({currentGender}) automatically.
            </p>
            {QUICK_DEMOS.map((demo) => (
              <div key={demo.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{demo.icon}</span>
                  <div className="text-white font-bold">{demo.title}</div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(demo.languages).map(([language, files]) => {
                    const loadKey = `${demo.id}:${language}`;
                    const isLoading = demoLoadingId === loadKey;
                    const usingFallback = currentGender === 'male' && !files.male;
                    return (
                      <button
                        key={language}
                        onClick={() => handleDemoClick(demo.id, demo.title, language, files)}
                        disabled={demoLoadingId !== null}
                        title={usingFallback ? `No male voice for ${language} yet — plays with the female voice` : undefined}
                        className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 border border-amber-500/30 rounded-lg px-3 py-2 transition-all text-sm"
                      >
                        {isLoading ? (
                          <i className="fas fa-spinner fa-spin text-amber-400"></i>
                        ) : (
                          <i className="fas fa-play text-amber-400"></i>
                        )}
                        <span className="text-amber-100 font-semibold">{language}</span>
                        {usingFallback && <i className="fas fa-venus text-amber-300/60 text-xs" title="Female voice (no male option yet)"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'batch' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-300">Paste Text (Batch Processing)</label>
                <span className="text-[11px] text-slate-400">Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">Enter</kbd> to submit</span>
              </div>
              <textarea 
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    if (!isLoading && batchText.trim()) handleBatchSubmit();
                  }
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                rows={5} 
                placeholder="Enter a large amount of text here to be signed... (Press Enter to process, Shift+Enter for newline)"
              />
            </div>
            <button 
              onClick={handleBatchSubmit}
              disabled={isLoading || !batchText.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30 mt-2 flex justify-center items-center gap-2 cursor-pointer"
            >
              {isLoading && <i className="fas fa-spinner fa-spin"></i>}
              {isLoading ? (loadingStatus || 'Processing...') : 'Process Text to Sign (Enter)'}
            </button>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-300">Topic (e.g. Photosynthesis)</label>
                <span className="text-[11px] text-slate-400">Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 font-mono text-[10px]">Enter</kbd> to submit</span>
              </div>
              <input 
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!isLoading && topic.trim()) handlePromptSubmit();
                  }
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="What should I explain? (Press Enter to generate)"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Instructions & Required Words</label>
              <textarea 
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
                    e.preventDefault();
                    if (!isLoading && topic.trim()) handlePromptSubmit();
                  }
                }}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                rows={3} 
                placeholder="e.g. Must include sunlight, water, carbon dioxide... (Press Enter to generate, Shift+Enter for newline)"
              />
            </div>
            <button 
              onClick={handlePromptSubmit}
              disabled={isLoading || !topic.trim()}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 mt-2 flex justify-center items-center gap-2 cursor-pointer"
            >
              {isLoading && <i className="fas fa-spinner fa-spin"></i>}
              {isLoading ? (loadingStatus || 'Processing...') : 'Generate & Translate (Enter)'}
            </button>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Upload PDF, DOCX, or PPTX</label>
              <input 
                type="file"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
              />
            </div>
            <button 
              onClick={handleUploadSubmit}
              disabled={isLoading || !file}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30 mt-2"
            >
              {isLoading ? 'Uploading & Streaming...' : 'Extract & Sign Document'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}



