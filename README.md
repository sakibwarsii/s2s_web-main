# 🤟 Speech to Sign — SignBridge

**An AI-powered real-time Sign Language translation platform for inclusive education.**

Convert speech, text, or uploaded documents into 3D avatar sign language — with Visual Assist for supporting images.

---

## ✨ Features

- **🎤 Live Mic Translation** — Real-time speech-to-sign with WebSocket streaming
- **💬 Batch Text Processing** — Paste large amounts of text, get it signed chunk by chunk
- **🤖 AI Prompt-to-Sign** — Enter a topic and let AI generate a script and sign it
- **📄 Document Upload** — Upload PDFs/DOCX, streaming sign language as it processes
- **🖼️ Visual Assist (β)** — AI-curated supporting images that change in sync with signing
- **👾 Multiple Avatars** — Switch between Luna, Siggi, Anna, Marc, Francoise
- **📺 Screenshare Mode** — Share your screen while the avatar signs in a PiP overlay
- **🎛️ Player Controls** — Pause, resume, skip forward/backward with keyboard shortcuts

---

## 🏗️ Architecture

```
speech to sign(updated)/
├── server/          # FastAPI backend
│   ├── main.py              # WebSocket server + routes
│   ├── ai_tools.py          # Batch/Prompt/Upload endpoints
│   ├── nlp_pipeline.py      # NLP gloss extraction + Groq LLM
│   ├── visual_assistant.py  # AI visual planning + image fetching
│   ├── document_processor.py
│   ├── sign_dict.json       # SiGML sign dictionary (~7000 signs)
│   └── fingerspell.json     # Fingerspelling fallback
│
└── web/             # Next.js 16 frontend
    ├── app/page.tsx         # Main page
    ├── components/          # UI components
    │   ├── SignAvatar.tsx        # CWASA 3D avatar wrapper
    │   ├── VisualAssistPanel.tsx # Image display panel
    │   ├── AIToolsModal.tsx      # AI tools (batch/prompt/upload)
    │   ├── ControlBar.tsx
    │   ├── PlayerControls.tsx
    │   ├── SettingsPanel.tsx
    │   └── TeacherHeader.tsx
    └── hooks/
        ├── useCWASA.ts          # Sign queue + playback engine
        ├── useVisualAssist.ts   # Visual state management
        ├── useSignSockets.ts    # WebSocket integration
        └── useSpeechRecognition.ts
```

---

## 🚀 Local Setup

### Backend (FastAPI)
```bash
cd "speech to sign(updated)"
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt  # or install manually (see server imports)
cd server
cp .env.example .env
# Add your GROQ_API_KEY to .env
python main.py
# Runs on http://localhost:8000
```

### Frontend (Next.js)
```bash
cd "speech to sign(updated)/web"
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## 🔑 Environment Variables

Create `server/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
PEXELS_API_KEY=your_pexels_api_key_here   # Optional — improves visual search
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).  
Get a free Pexels API key at [pexels.com/api](https://www.pexels.com/api/).

---

## 📦 Key Dependencies

**Backend:**
- `fastapi`, `uvicorn`, `websockets`
- `groq` — LLaMA 3.3 70B for NLP and script generation
- `spacy` — NLP sentence parsing
- `duckduckgo-search` — Image search for Visual Assist
- `python-docx`, `pypdf2`, `python-pptx` — Document processing
- `httpx` — Async HTTP

**Frontend:**
- `next` 16, `react` 19
- `react-rnd` — Draggable & resizable avatar PiP

---

## 🤝 Contributing

Pull requests welcome! This project is focused on accessibility and inclusive education technology.
