"use client";

import React, { useState, useEffect, useRef } from 'react';

export default function SandboxPage() {
  const [targetLanguage, setTargetLanguage] = useState("Hindi");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [inputText, setInputText] = useState("What is photosynthesis?");
  
  const [receivedText, setReceivedText] = useState("");
  const [receivedOriginal, setReceivedOriginal] = useState("");
  const [receivedAudio, setReceivedAudio] = useState("");
  const [status, setStatus] = useState("Disconnected");
  
  const wsTeacherRef = useRef<WebSocket | null>(null);
  const wsDisplayRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const getWsBaseUrl = () => {
      const explicit = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (explicit) {
        return explicit.replace(/^http/i, 'ws').replace(/\/+$/, '');
      }
      if (typeof window !== 'undefined' && !window.location.host.includes('localhost') && !window.location.host.includes('127.0.0.1')) {
        return 'wss://signova-backend-baas.onrender.com';
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      return `${protocol}//${host}`;
    };

    const sessionId = 'sandbox_' + Math.random().toString(36).substring(2, 9);

    wsDisplayRef.current = new WebSocket(`${getWsBaseUrl()}/ws/display?session_id=${encodeURIComponent(sessionId)}`);
    wsDisplayRef.current.onopen = () => setStatus("Connected");
    
    wsDisplayRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "final") {
        setReceivedText(data.text);
        setReceivedOriginal(data.original_text || "");
        
        if (data.audio) {
          setReceivedAudio(data.audio);
          // Try autoplaying natively, but the audio element will provide a fallback play button
        }
      }
    };

    wsTeacherRef.current = new WebSocket(`${getWsBaseUrl()}/ws/teacher?session_id=${encodeURIComponent(sessionId)}`);

    return () => {
      if (wsDisplayRef.current) wsDisplayRef.current.close();
      if (wsTeacherRef.current) wsTeacherRef.current.close();
    };
  }, []);

  const updateConfig = () => {
    if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
      wsTeacherRef.current.send(JSON.stringify({
        type: "config",
        targetLanguage,
        ttsEnabled
      }));
    }
  };

  useEffect(() => {
    // Wait a bit for connection before sending initial config
    const timer = setTimeout(() => updateConfig(), 1000);
    return () => clearTimeout(timer);
  }, [targetLanguage, ttsEnabled]);

  const handleSendText = () => {
    if (wsTeacherRef.current && wsTeacherRef.current.readyState === WebSocket.OPEN) {
      updateConfig(); // Ensure config is sent before text
      wsTeacherRef.current.send(JSON.stringify({ 
        type: "text", 
        isFinal: true, 
        payload: inputText 
      }));
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white p-8 font-sans">
      {/* Back Button */}
      <a href="/" className="absolute top-6 left-6 z-[200] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 flex items-center justify-center text-white shadow-lg transition-all hover:scale-110">
        <i className="fas fa-arrow-left text-xl"></i>
      </a>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400">API Sandbox: Multilingual TTS & Translation</h1>
        
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-8 space-y-4">
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${status === 'Connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              Status: {status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Target Language</label>
              <select 
                value={targetLanguage} 
                onChange={e => setTargetLanguage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2 text-white outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>
            <div className="flex items-center mt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={ttsEnabled} 
                  onChange={e => setTtsEnabled(e.target.checked)} 
                  className="w-5 h-5 rounded border-slate-600"
                />
                <span className="text-sm font-medium text-slate-300">Enable ONNX TTS</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium mb-2 text-slate-300">Teacher's English Speech</label>
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg p-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none mb-4"
              rows={3}
            />
            <button 
              onClick={handleSendText}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-all"
            >
              Simulate Teacher Speech
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* LOGS PANEL */}
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl h-[300px]">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Original Text</h2>
            {receivedOriginal ? (
              <p className="text-slate-300 text-lg">{receivedOriginal}</p>
            ) : (
              <p className="text-slate-500 text-sm">Waiting for speech...</p>
            )}
          </div>

          {/* SUBTITLE PANEL */}
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl h-[300px] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-slate-200">Translated Subtitle</h2>
            <div className="flex-1 flex items-center justify-center">
              {receivedText ? (
                <p className="text-3xl text-emerald-400 font-bold text-center">{receivedText}</p>
              ) : (
                <p className="text-slate-500 text-sm">Waiting for translation...</p>
              )}
            </div>
            {ttsEnabled && (
              <div className="mt-6 flex flex-col items-center">
                <p className="text-amber-400 text-sm mb-2 text-center">TTS Audio Player:</p>
                {receivedAudio ? (
                  <audio src={receivedAudio} controls autoPlay className="w-full max-w-xs outline-none" />
                ) : (
                  <div className="w-full max-w-xs h-[54px] bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Audio Not Ready</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

