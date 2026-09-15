"use client";

import React, { useState } from 'react';
import { getAvatarGender, getVoiceForLanguage } from '../lib/voiceGender';

const AVATARS = [
  { id: 'luna', label: 'Mentor Luna 🇮🇳 (AI Sign Mentor · Emerald Saree)' },
  { id: 'anna', label: 'Instructor Anna (Sign Language Educator)' },
  { id: 'marc', label: 'Professor Marc (Senior Educator)' },
  { id: 'siggi', label: 'Coach Siggi (Visual Learning Mentor)' }
];


interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  setTeacherName: (name: string) => void;
  topic: string;
  setTopic: (topic: string) => void;
  avatarName: string;
  setAvatarName: (avatar: string) => void;
  transcriptHistory: { time: string, text: string }[];
  wsTeacherRef: React.MutableRefObject<WebSocket | null>;
  sttMode: 'vosk' | 'browser';
  setSttMode: (mode: 'vosk' | 'browser') => void;
  showAvatarBg: boolean;
  setShowAvatarBg: (show: boolean) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  targetVoice: string;
  setTargetVoice: (voice: string) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  characterScale: number;
  setCharacterScale: (scale: number) => void;
  /** Display-only: merges caption fragments into the full current sentence
   *  instead of showing each 5-word sign-timing chunk as its own caption.
   *  Purely cosmetic â€” never touches sign/audio timing. Default off. */
  fullSentenceCaptions: boolean;
  setFullSentenceCaptions: (enabled: boolean) => void;
  /** Optional richer classroom visuals â€” smartboard bezel polish, warm
   *  directional lighting, ground shadow under the avatar. Default off;
   *  the current look is unchanged unless this is turned on. */
  classroomAmbience: boolean;
  setClassroomAmbience: (enabled: boolean) => void;
}

export default function SettingsPanel({
  isOpen, onClose,
  teacherName, setTeacherName,
  topic, setTopic,
  avatarName, setAvatarName,
  transcriptHistory, wsTeacherRef,
  sttMode, setSttMode,
  showAvatarBg, setShowAvatarBg,
  targetLanguage, setTargetLanguage,
  targetVoice, setTargetVoice,
  ttsEnabled, setTtsEnabled,
  characterScale, setCharacterScale,
  fullSentenceCaptions, setFullSentenceCaptions,
  classroomAmbience, setClassroomAmbience
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'avatar' | 'translation' | 'history'>('general');

  if (!isOpen) return null;

  const handleAvatarChange = (av: string) => {
    localStorage.setItem("cwasa_avatar", av);
    // Auto-match the TTS voice's gender to the new character (male avatar ->
    // male voice, female -> female) for whatever language is currently
    // selected. Written directly into localStorage here, not via React state,
    // because this whole flow ends in a full page reload right after —
    // page.tsx will pick it back up on the next mount along with the avatar.
    const matchedVoice = getVoiceForLanguage(targetLanguage, getAvatarGender(av));
    if (matchedVoice) {
      localStorage.setItem("static_target_voice", matchedVoice);
    }
    window.location.reload(); // Force full reload to reset legacy CWASA engine
  };

  const handleDownloadTranscript = () => {
    let content = `# Lecture Transcript\nTeacher: ${teacherName}\nTopic: ${topic}\nDate: ${new Date().toLocaleDateString()}\n\n`;
    transcriptHistory.forEach(item => {
      content += `[${item.time}] ${item.text}\n`;
    });
    
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Transcript_${topic.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl h-[88vh] md:h-[600px] bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar / Top bar Tabs */}
        <div className="w-full md:w-64 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-3 sm:p-4 md:p-6 flex flex-col shrink-0">
          <div className="flex justify-between items-center mb-3 md:mb-8">
            <h2 className="text-lg md:text-2xl font-bold text-white">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1.5 transition-colors">
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
          
          <div className="flex md:flex-col gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            <button 
              onClick={() => setActiveTab('general')}
              className={`whitespace-nowrap text-left px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all shrink-0 ${
                activeTab === 'general' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <i className="fas fa-sliders-h mr-2 md:mr-3"></i> General
            </button>
            
            <button 
              onClick={() => setActiveTab('avatar')}
              className={`whitespace-nowrap text-left px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all shrink-0 ${
                activeTab === 'avatar' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <i className="fas fa-user-astronaut mr-2 md:mr-3"></i> Character
            </button>

            <button 
              onClick={() => setActiveTab('translation')}
              className={`whitespace-nowrap text-left px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all shrink-0 ${
                activeTab === 'translation' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <i className="fas fa-language mr-2 md:mr-3"></i> Translation
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              className={`whitespace-nowrap text-left px-3 py-2 md:px-4 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all shrink-0 ${
                activeTab === 'history' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-gray-400 hover:bg-white/5'
              }`}
            >
              <i className="fas fa-history mr-2 md:mr-3"></i> Transcript
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-4">Session Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Teacher Name</label>
                  <input 
                    type="text" 
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Topic</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                  />
                </div>
                
                <div className="pt-4 border-t border-white/10 mt-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">Speech-To-Text Engine</label>
                  <div className="flex bg-black/50 border border-white/10 rounded-xl overflow-hidden p-1">
                    <button 
                      onClick={() => setSttMode('vosk')}
                      className={`flex-1 py-2.5 rounded-lg transition-all text-sm font-medium ${sttMode === 'vosk' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <i className="fas fa-bolt mr-2 text-yellow-400"></i> Vosk (Lightning / Local)
                    </button>
                    <button 
                      onClick={() => setSttMode('browser')}
                      className={`flex-1 py-2.5 rounded-lg transition-all text-sm font-medium ${sttMode === 'browser' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                      <i className="fab fa-chrome mr-2 text-blue-300"></i> Browser STT (Cloud)
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 ml-1">Vosk provides continuous, lag-free offline streaming. Browser uses cloud STT but suffers from auto-timeouts.</p>
                </div>

                <div className="pt-4 border-t border-white/10 mt-6">
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                    <div>
                      <h4 className="text-white font-medium">Full-Sentence Captions</h4>
                      <p className="text-gray-400 text-sm mt-1">Show the whole current sentence as it builds up, instead of a short rolling fragment. Display only &mdash; doesn&apos;t change sign or audio timing.</p>
                    </div>
                    <button
                      onClick={() => setFullSentenceCaptions(!fullSentenceCaptions)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${fullSentenceCaptions ? 'bg-purple-600' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${fullSentenceCaptions ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'avatar' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-4">Character Selection</h3>
              <p className="text-gray-400 text-sm">Select a 3D Sign Language Avatar. <span className="text-yellow-400">Warning: Changing avatars will reload the page to cleanly reset the WebGL engine.</span></p>
              
              <div className="grid grid-cols-2 gap-4">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => handleAvatarChange(avatar.id)}
                    className={`relative overflow-hidden rounded-2xl border-2 transition-all h-32 flex items-center justify-center ${
                      avatarName === avatar.id 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
                        : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg font-medium text-white capitalize">{avatar.label}</span>
                    {avatarName === avatar.id && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs"></i>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                  <div>
                    <h4 className="text-white font-medium">Avatar PiP Background</h4>
                    <p className="text-gray-400 text-sm mt-1">Show a dark background box behind the avatar in Visual Mode for better contrast.</p>
                  </div>
                  <button
                    onClick={() => setShowAvatarBg(!showAvatarBg)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${showAvatarBg ? 'bg-blue-600' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAvatarBg ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">Character Size</h4>
                      <p className="text-gray-400 text-sm mt-1">Zoom the avatar bigger without needing to resize the mini-player box. Framing (head-to-waist) stays the same at every level.</p>
                    </div>
                    <span className="text-blue-300 font-semibold text-lg w-10 text-center">{characterScale}x</span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 1.5, 2, 2.5, 3].map((level) => (
                      <button
                        key={level}
                        onClick={() => setCharacterScale(level)}
                        className={`flex-1 py-2.5 rounded-lg transition-all text-sm font-medium ${
                          characterScale === level
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-black/30 text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'
                        }`}
                      >
                        {level}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 mt-6">
                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                  <div>
                    <h4 className="text-white font-medium">Classroom Ambience <span className="text-[10px] text-purple-300 font-black uppercase tracking-wider ml-1 align-middle">New</span></h4>
                    <p className="text-gray-400 text-sm mt-1">Richer smartboard frame, warm directional lighting, and a ground shadow under the avatar for a more grounded, room-like feel. The current look is unchanged unless this is on.</p>
                  </div>
                  <button
                    onClick={() => setClassroomAmbience(!classroomAmbience)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${classroomAmbience ? 'bg-purple-600' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${classroomAmbience ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'translation' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-semibold text-white border-b border-white/10 pb-4">Translation & Audio</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Target Language (Subtitles & Audio)</label>
                  <select 
                    value={targetLanguage} 
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setTargetLanguage(newLang);
                      // Auto-select a voice for the new language matching the
                      // CURRENTLY selected avatar's gender â€” was previously a
                      // fixed voice per language regardless of avatar (which
                      // is why, e.g., Hindi always defaulted to a male voice
                      // even with a female avatar selected).
                      const matchedVoice = getVoiceForLanguage(newLang, getAvatarGender(avatarName));
                      if (matchedVoice) setTargetVoice(matchedVoice);
                    }}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none"
                  >
                    <option value="English">English (Original)</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Malayalam">Malayalam</option>
                    <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">TTS Voice</label>
                  <select
                    value={targetVoice}
                    onChange={(e) => setTargetVoice(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none"
                  >
                    {targetLanguage === "English" && (
                      <>
                        <option value="en-US-GuyNeural">Guy (Male)</option>
                        <option value="en-US-AriaNeural">Aria (Female)</option>
                      </>
                    )}
                    {targetLanguage === "Hindi" && (
                      <>
                        <option value="hi-IN-MadhurNeural">Madhur (Male)</option>
                        <option value="hi-IN-SwaraNeural">Swara (Female)</option>
                      </>
                    )}
                    {targetLanguage === "Marathi" && (
                      <>
                        <option value="mr-IN-ManoharNeural">Manohar (Male)</option>
                        <option value="mr-IN-AarohiNeural">Aarohi (Female)</option>
                      </>
                    )}
                    {targetLanguage === "Malayalam" && (
                      <>
                        <option value="ml-IN-MidhunNeural">Midhun (Male)</option>
                        <option value="ml-IN-SobhanaNeural">Sobhana (Female)</option>
                      </>
                    )}
                    {targetLanguage === "Telugu" && (
                      <>
                        <option value="te-IN-MohanNeural">Mohan (Male)</option>
                        <option value="te-IN-ShrutiNeural">Shruti (Female)</option>
                      </>
                    )}
                    {targetLanguage === "Kannada" && (
                      <>
                        <option value="kn-IN-GaganNeural">Gagan (Male)</option>
                        <option value="kn-IN-SapnaNeural">Sapna (Female)</option>
                      </>
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-2 ml-1">Auto-matches the selected character&apos;s gender when you change language or character â€” pick a different voice here any time to override.</p>
                </div>

                <div className="pt-4 border-t border-white/10 mt-6">
                  <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl p-4">
                    <div>
                      <h4 className="text-white font-medium">Text-To-Speech (TTS)</h4>
                      <p className="text-gray-400 text-sm mt-1">Play translated audio aloud using local ONNX AI models.</p>
                    </div>
                    <button 
                      onClick={() => setTtsEnabled(!ttsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ttsEnabled ? 'bg-orange-600' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ttsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="text-xl font-semibold text-white">Lecture Transcript</h3>
                <button 
                  onClick={handleDownloadTranscript}
                  disabled={transcriptHistory.length === 0}
                  className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
                >
                  <i className="fas fa-download mr-2"></i> Download .txt
                </button>
              </div>
              
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 overflow-y-auto space-y-3 font-mono text-sm">
                {transcriptHistory.length === 0 ? (
                  <p className="text-gray-500 text-center mt-10">No transcript history yet. Start speaking to record.</p>
                ) : (
                  transcriptHistory.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-gray-500 shrink-0">[{item.time}]</span>
                      <span className="text-gray-200">{item.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-white/5 hover:bg-red-500/80 rounded-full flex items-center justify-center text-white transition-all"
        >
          <i className="fas fa-times"></i>
        </button>

      </div>
    </div>
  );
}



