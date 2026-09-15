"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { generateClientEducationalChunk } from "../lib/clientSignConverter";

interface SmartWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  targetLanguage?: string;
  targetVoice?: string;
  ttsEnabled?: boolean;
  onProcessSuccess: (chunks: any[], options?: { replace?: boolean }) => void;
  onStatusChange?: (status: string | null) => void;
  isPdfAnnotateMode?: boolean;
  pdfUrl?: string | null;
  onTogglePdfMode?: () => void;
}

export type ToolType = 
  | "pan"
  | "pen" 
  | "brush" 
  | "type"
  | "eraser" 
  | "axes" 
  | "arrow" 
  | "line" 
  | "circle" 
  | "rect" 
  | "triangle" 
  | "wave" 
  | "angle";

export interface WhiteboardTextBlock {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  isEditing: boolean;
}

interface StrokePoint {
  x: number;
  y: number;
  t: number;
}

interface StrokeData {
  tool: ToolType;
  color: string;
  width: number;
  points: StrokePoint[];
  text?: string;
}

const PRESET_COLORS = [
  { name: "Chalk White", value: "#ffffff" },
  { name: "Chalk Yellow", value: "#fef08a" },
  { name: "Neon Green", value: "#4ade80" },
  { name: "Sky Blue", value: "#38bdf8" },
  { name: "Chalk Pink", value: "#f472b6" },
  { name: "Warm Orange", value: "#fb923c" },
  { name: "Chalk Red", value: "#f87171" },
  { name: "Dark Ink", value: "#1e293b" },
];

const MATH_PHYSICS_SYMBOLS = [
  "F = ma",
  "E = mc²",
  "v = d / t",
  "W = F · d",
  "V = I · R",
  "π",
  "θ",
  "Σ",
  "√",
  "∫",
  "Δ",
  "λ",
  "α",
  "β",
  "∞",
  "≈"
];

// Educational definitions translated and signed when shapes are selected or drawn from equipments
const SHAPE_TRANSLATIONS: Record<string, { title: string; prompt: string }> = {
  axes: {
    title: "Coordinate Axes",
    prompt: "Cartesian coordinate axes X and Y defining the plane."
  },
  arrow: {
    title: "Vector Arrow",
    prompt: "Vector quantity having magnitude and direction."
  },
  circle: {
    title: "Circle",
    prompt: "Circle geometry with radius and circumference."
  },
  rect: {
    title: "Rectangle Mass Block",
    prompt: "Rectangle mass block on a surface."
  },
  triangle: {
    title: "Triangle",
    prompt: "Triangle geometry and optics refraction prism."
  },
  wave: {
    title: "Wave and Spring",
    prompt: "Sinusoidal oscillating wave and physics spring."
  },
  angle: {
    title: "Angle Theta",
    prompt: "Angle theta measured in degrees and radians."
  }
};

export default function SmartWhiteboard({
  isOpen,
  onClose,
  targetLanguage = "English",
  targetVoice = "en-US-AriaNeural",
  ttsEnabled = true,
  onProcessSuccess,
  onStatusChange,
  isPdfAnnotateMode = false,
  pdfUrl = null,
  onTogglePdfMode,
}: SmartWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tools & Styling
  const [currentTool, setCurrentTool] = useState<ToolType>("pen");
  const [strokeColor, setStrokeColor] = useState<string>("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [eraserSize, setEraserSize] = useState<number>(55); // Generous, visible eraser size (35, 55, 90)
  const eraserCursorRef = useRef<HTMLDivElement | null>(null);
  const handwritingAbortRef = useRef<AbortController | null>(null);
  const [boardTheme, setBoardTheme] = useState<"dark" | "green" | "white">("dark");

  // PDF Page Navigation & Zoom (for PDF Annotation Mode)
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [pdfZoom, setPdfZoom] = useState<number>(100);

  // Type Tool & Draggable Text Blocks
  const [typeFontSize, setTypeFontSize] = useState<number>(24);
  const [textBlocks, setTextBlocks] = useState<WhiteboardTextBlock[]>([]);
  const [activeDraggingBlockId, setActiveDraggingBlockId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // History & Strokes (Active board layer)
  const strokesRef = useRef<StrokeData[]>([]);
  const historyRef = useRef<StrokeData[][]>([]);
  const redoStackRef = useRef<StrokeData[][]>([]);
  const currentStrokePoints = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const startPosRef = useRef<StrokePoint>({ x: 0, y: 0, t: 0 });

  // ISOLATED STROKE STORAGE: Ensures Chalkboard writing NEVER leaks onto PDF, and PDF annotations NEVER leak onto Chalkboard
  const chalkboardStrokesRef = useRef<StrokeData[]>([]);
  const chalkboardHistoryRef = useRef<StrokeData[][]>([]);
  const chalkboardRedoRef = useRef<StrokeData[][]>([]);
  const chalkboardTextBlocksRef = useRef<WhiteboardTextBlock[]>([]);

  const pdfStrokesRef = useRef<StrokeData[]>([]);
  const pdfHistoryRef = useRef<StrokeData[][]>([]);
  const pdfRedoRef = useRef<StrokeData[][]>([]);
  const pdfTextBlocksRef = useRef<WhiteboardTextBlock[]>([]);

  const prevModeRef = useRef<boolean>(isPdfAnnotateMode);

  // AI & Simultaneous Auto-Sign State (Enabled by default)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [autoSignEnabled, setAutoSignEnabled] = useState<boolean>(true);
  const autoSignTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Background colors: transparent in PDF annotation mode so underlying PDF document is visible
  const themeBg = isPdfAnnotateMode
    ? "transparent"
    : boardTheme === "green" 
      ? "#0b2518" 
      : boardTheme === "dark" 
        ? "#0f172a" 
        : "#f8fafc";

  // Redraw the canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isPdfAnnotateMode) {
      // Apply board theme background
      ctx.fillStyle = themeBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle grid/chalkboard texture for slate and green boards
      if (boardTheme === "dark" || boardTheme === "green") {
        ctx.fillStyle = boardTheme === "dark" ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.015)";
        for (let i = 0; i < canvas.width; i += 40) {
          ctx.fillRect(i, 0, 1, canvas.height);
        }
        for (let j = 0; j < canvas.height; j += 40) {
          ctx.fillRect(0, j, canvas.width, 1);
        }
      }
    }

    ctx.restore();

    // Scale context by DPR so all stroke points render sharply at exact screen resolution
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Replay all strokes
    strokesRef.current.forEach((stroke) => {
      renderStroke(ctx, stroke);
    });

    ctx.restore();
  }, [themeBg, boardTheme, isPdfAnnotateMode]);

  // Isolate strokes and text blocks when switching between Chalkboard and PDF Annotate Mode
  useEffect(() => {
    if (prevModeRef.current !== isPdfAnnotateMode) {
      if (prevModeRef.current) {
        // Was in PDF mode -> Save PDF strokes & notes
        pdfStrokesRef.current = [...strokesRef.current];
        pdfHistoryRef.current = [...historyRef.current];
        pdfRedoRef.current = [...redoStackRef.current];
        pdfTextBlocksRef.current = [...textBlocks];

        // Restore Chalkboard strokes & notes
        strokesRef.current = [...chalkboardStrokesRef.current];
        historyRef.current = [...chalkboardHistoryRef.current];
        redoStackRef.current = [...chalkboardRedoRef.current];
        setTextBlocks([...chalkboardTextBlocksRef.current]);

        if (currentTool === "pan") {
          setCurrentTool("pen");
        }
      } else {
        // Was in Chalkboard mode -> Save Chalkboard strokes & notes
        chalkboardStrokesRef.current = [...strokesRef.current];
        chalkboardHistoryRef.current = [...historyRef.current];
        chalkboardRedoRef.current = [...redoStackRef.current];
        chalkboardTextBlocksRef.current = [...textBlocks];

        // Restore PDF strokes & notes
        strokesRef.current = [...pdfStrokesRef.current];
        historyRef.current = [...pdfHistoryRef.current];
        redoStackRef.current = [...pdfRedoRef.current];
        setTextBlocks([...pdfTextBlocksRef.current]);

        // Default to pan/scroll in PDF mode so user can scroll effortlessly
        setCurrentTool("pan");
      }
      prevModeRef.current = isPdfAnnotateMode;
      setTimeout(() => redrawCanvas(), 50);
    }
  }, [isPdfAnnotateMode, redrawCanvas, textBlocks, currentTool]);

  // Translate and sign typed text card with instant 0ms client sign generation
  const signTextBlock = async (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    // 1. Instant 0ms Client-side SiGML generation: Avatar starts signing immediately!
    try {
      const clientChunk = await generateClientEducationalChunk(clean, "Text Note");
      if (clientChunk.sigml && clientChunk.sigml.length > 0) {
        onProcessSuccess([clientChunk], { replace: false });
      }
    } catch (clientErr) {
      console.warn("Client instant sign error:", clientErr);
    }

    // 2. If TTS is enabled, fetch audio from backend in the background without blocking
    if (ttsEnabled) {
      try {
        setIsAnalyzing(true);
        const res = await fetch("/api/analyze-handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strokes: [],
            raw_text: clean,
            lang: targetLanguage,
            voice: targetVoice,
            tts: true,
            width: 800,
            height: 600,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.chunks && data.chunks.length > 0) {
            onProcessSuccess(data.chunks, { replace: false });
          }
        }
      } catch (e) {
        console.warn("signTextBlock remote TTS error:", e);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  // Render a single stroke or shape
  const renderStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeData) => {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (stroke.tool === "eraser") {
      if (isPdfAnnotateMode) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = themeBg;
      }
      ctx.lineWidth = stroke.width || eraserSize;
    } else if (stroke.tool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = stroke.width * 3;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.fillStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = 1.0;
    }

    const pts = stroke.points;
    if (pts.length === 0) {
      ctx.restore();
      return;
    }

    if (stroke.tool === "pen" || stroke.tool === "brush" || stroke.tool === "eraser") {
      // Freehand drawing: single point = dot, multiple points = smooth curve
      if (pts.length === 1) {
        ctx.beginPath();
        const r = stroke.tool === "eraser" ? (stroke.width || eraserSize) / 2 : (stroke.tool === "brush" ? (stroke.width * 3) / 2 : stroke.width / 2);
        ctx.arc(pts[0].x, pts[0].y, Math.max(1.5, r), 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          const midX = (pts[i - 1].x + pts[i].x) / 2;
          const midY = (pts[i - 1].y + pts[i].y) / 2;
          ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, midX, midY);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    } else if (stroke.tool === "axes") {
      // Cartesian Coordinate axes
      const start = pts[0];
      const end = pts[pts.length - 1];
      const midX = start.x;
      const midY = end.y;

      // X-Axis
      ctx.beginPath();
      ctx.moveTo(start.x - 60, midY);
      ctx.lineTo(end.x + 60, midY);
      ctx.stroke();

      // X-Axis arrow
      drawArrowHead(ctx, end.x + 60, midY, 0);

      // Y-Axis
      ctx.beginPath();
      ctx.moveTo(midX, end.y + 60);
      ctx.lineTo(midX, start.y - 60);
      ctx.stroke();

      // Y-Axis arrow
      drawArrowHead(ctx, midX, start.y - 60, -Math.PI / 2);

      // Labels
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("+x", end.x + 70, midY + 5);
      ctx.fillText("+y", midX - 10, start.y - 70);
      ctx.fillText("0", midX - 15, midY + 18);
    } else if (stroke.tool === "arrow") {
      // Vector arrow
      const start = pts[0];
      const end = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      drawArrowHead(ctx, end.x, end.y, angle);
    } else if (stroke.tool === "line") {
      const start = pts[0];
      const end = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (stroke.tool === "circle") {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const radiusX = Math.abs(end.x - start.x) / 2;
      const radiusY = Math.abs(end.y - start.y) / 2;
      const centerX = Math.min(start.x, end.x) + radiusX;
      const centerY = Math.min(start.y, end.y) + radiusY;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (stroke.tool === "rect") {
      const start = pts[0];
      const end = pts[pts.length - 1];
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const w = Math.abs(end.x - start.x);
      const h = Math.abs(end.y - start.y);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();
    } else if (stroke.tool === "triangle") {
      const start = pts[0];
      const end = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, end.y);
      ctx.lineTo((start.x + end.x) / 2, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.closePath();
      ctx.stroke();
    } else if (stroke.tool === "wave") {
      // Sinusoidal wave / Spring symbol
      const start = pts[0];
      const end = pts[pts.length - 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(start.x, start.y);
      ctx.rotate(angle);
      ctx.beginPath();
      const cycles = 6;
      const amplitude = 16;
      ctx.moveTo(0, 0);
      for (let i = 0; i <= length; i += 4) {
        const y = Math.sin((i / length) * cycles * Math.PI * 2) * amplitude;
        ctx.lineTo(i, y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (stroke.tool === "angle") {
      // Angle arc
      const start = pts[0];
      const end = pts[pts.length - 1];
      const mid = { x: start.x, y: end.y };
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(mid.x, mid.y);
      ctx.lineTo(end.x, mid.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mid.x, mid.y, 30, -Math.PI / 2, 0);
      ctx.stroke();

      ctx.font = "italic 16px serif";
      ctx.fillText("θ", mid.x + 35, mid.y - 10);
    }

    if (stroke.text) {
      ctx.font = "bold 20px monospace";
      ctx.fillText(stroke.text, pts[0].x, pts[0].y);
    }

    ctx.restore();
  };

  const drawArrowHead = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    const headLength = 14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headLength, -headLength / 2);
    ctx.lineTo(-headLength, headLength / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // Resize canvas to fill container
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      redrawCanvas();
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    window.addEventListener("resize", resize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [isOpen, redrawCanvas]);

  // Pointer event handlers for drawing
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleBlockDragStart = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setActiveDraggingBlockId(id);
    const block = textBlocks.find(b => b.id === id);
    if (block) {
      dragOffsetRef.current = {
        x: e.clientX - block.x,
        y: e.clientY - block.y
      };
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDraggingBlockId) {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const clientX = e.clientX - bounds.left;
      const clientY = e.clientY - bounds.top;
      setTextBlocks(prev => prev.map(b => {
        if (b.id === activeDraggingBlockId) {
          return {
            ...b,
            x: Math.max(10, clientX - 30),
            y: Math.max(10, clientY - 15)
          };
        }
        return b;
      }));
    }
  };

  const handleContainerPointerUp = () => {
    if (activeDraggingBlockId) {
      setActiveDraggingBlockId(null);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentTool === "pan") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getCoordinates(e);

    // If Type tool is active: click anywhere on board/PDF spawns a draggable text block!
    if (currentTool === "type") {
      const newId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const bounds = containerRef.current?.getBoundingClientRect();
      const maxX = bounds ? bounds.width - 260 : 500;
      const maxY = bounds ? bounds.height - 120 : 400;
      const spawnX = Math.max(15, Math.min(pos.x - 10, maxX));
      const spawnY = Math.max(15, Math.min(pos.y - 15, maxY));

      const newBlock: WhiteboardTextBlock = {
        id: newId,
        x: spawnX,
        y: spawnY,
        text: "",
        fontSize: typeFontSize,
        color: strokeColor,
        isEditing: true
      };
      setTextBlocks(prev => [...prev, newBlock]);
      return;
    }

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDrawingRef.current = true;
    startPosRef.current = { x: pos.x, y: pos.y, t: Date.now() };
    currentStrokePoints.current = [{ x: pos.x, y: pos.y, t: Date.now() }];
    if (currentTool === "eraser" && eraserCursorRef.current) {
      eraserCursorRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }

    // Draw initial dot immediately on touch/click
    const ctx = canvas.getContext("2d");
    if (ctx && (currentTool === "pen" || currentTool === "brush" || currentTool === "eraser")) {
      ctx.save();
      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (currentTool === "eraser") {
        if (isPdfAnnotateMode) {
          ctx.globalCompositeOperation = "destination-out";
          ctx.fillStyle = "rgba(0,0,0,1)";
        } else {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = themeBg;
        }
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, eraserSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentTool === "brush") {
        ctx.fillStyle = strokeColor;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, (strokeWidth * 3) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(1.5, strokeWidth / 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (autoSignTimerRef.current) {
      clearTimeout(autoSignTimerRef.current);
      autoSignTimerRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentTool === "pan") return;
    const pos = getCoordinates(e);
    if (currentTool === "eraser" && eraserCursorRef.current) {
      eraserCursorRef.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }

    if (!isDrawingRef.current) return;
    currentStrokePoints.current.push({ x: pos.x, y: pos.y, t: Date.now() });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (currentTool === "pen" || currentTool === "brush" || currentTool === "eraser") {
      // Real-time smooth drawing
      const pts = currentStrokePoints.current;
      if (pts.length > 1) {
        ctx.save();
        const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (currentTool === "eraser") {
          if (isPdfAnnotateMode) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
          } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = themeBg;
          }
          ctx.lineWidth = eraserSize;
        } else if (currentTool === "brush") {
          ctx.strokeStyle = strokeColor;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = strokeWidth * 3;
        } else {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
        }
        ctx.beginPath();
        const prev = pts[pts.length - 2];
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
      }
    } else {
      // Shape preview: redraw everything + live shape
      redrawCanvas();
      const previewStroke: StrokeData = {
        tool: currentTool,
        color: strokeColor,
        width: strokeWidth,
        points: [startPosRef.current, { x: pos.x, y: pos.y, t: Date.now() }],
      };
      renderStroke(ctx, previewStroke);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (currentTool === "pan") return;
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    const pts = currentStrokePoints.current;
    if (pts.length > 0) {
      // Save to undo history
      historyRef.current.push([...strokesRef.current]);
      redoStackRef.current = [];

      const newStroke: StrokeData = {
        tool: currentTool,
        color: strokeColor,
        width: currentTool === "eraser" ? eraserSize : strokeWidth,
        points: currentTool === "pen" || currentTool === "brush" || currentTool === "eraser"
          ? [...pts]
          : [startPosRef.current, pts[pts.length - 1]],
      };
      strokesRef.current.push(newStroke);
      redrawCanvas();

      // If user drew a shape tool, translate & sign the shape concept automatically!
      if (SHAPE_TRANSLATIONS[currentTool]) {
        translateAndSignConcept(SHAPE_TRANSLATIONS[currentTool].prompt, true);
      } else if (autoSignEnabled && (currentTool === "pen" || currentTool === "brush")) {
        // Simultaneous Auto-Sign: 1100ms debounce after stroke lift so avatar signs when user pauses writing!
        if (autoSignTimerRef.current) clearTimeout(autoSignTimerRef.current);
        autoSignTimerRef.current = setTimeout(() => {
          triggerHandwritingAnalysis();
        }, 1100);
      }
    }
    currentStrokePoints.current = [];
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    if (previous !== undefined) {
      redoStackRef.current.push([...strokesRef.current]);
      strokesRef.current = previous;
      redrawCanvas();
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (next !== undefined) {
      historyRef.current.push([...strokesRef.current]);
      strokesRef.current = next;
      redrawCanvas();
    }
  };

  const handleClear = () => {
    if (strokesRef.current.length === 0) return;
    historyRef.current.push([...strokesRef.current]);
    redoStackRef.current = [];
    strokesRef.current = [];
    redrawCanvas();
  };

  // Selection of shape from equipment: sets tool AND automatically translates and signs the shape!
  const selectShapeTool = (shape: ToolType) => {
    setCurrentTool(shape);
    const info = SHAPE_TRANSLATIONS[shape];
    if (info) {
      translateAndSignConcept(info.prompt, true);
    }
  };

  // Stamp a math/physics formula or symbol onto board AND translate to sign language
  const handleStampSymbol = (symbol: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = rect.width / 2 - 40;
    const y = rect.height / 2;

    historyRef.current.push([...strokesRef.current]);
    redoStackRef.current = [];

    const stampStroke: StrokeData = {
      tool: "pen",
      color: strokeColor,
      width: strokeWidth,
      points: [{ x, y, t: Date.now() }],
      text: symbol,
    };
    strokesRef.current.push(stampStroke);
    redrawCanvas();

    // Automatically translate and sign formula symbol
    translateAndSignConcept(symbol, false);
  };

  // Translates an educational shape or formula concept directly into ISL
  const translateAndSignConcept = async (conceptPrompt: string, isShape: boolean = false) => {
    if (!conceptPrompt.trim()) return;
    onStatusChange?.(`Translating ${isShape ? "shape" : "formula"} to Sign Language...`);

    // 1. Instant 0ms Client-side SiGML generation: Avatar starts signing immediately!
    try {
      const clientChunk = await generateClientEducationalChunk(conceptPrompt, isShape ? "Geometric Shape" : "Formula");
      if (clientChunk.sigml && clientChunk.sigml.length > 0) {
        onProcessSuccess([clientChunk], { replace: false });
        onStatusChange?.(null);
      }
    } catch (clientErr) {
      console.warn("Client instant sign error:", clientErr);
    }

    // 2. If TTS is enabled, fetch audio from backend in the background without blocking
    if (ttsEnabled) {
      try {
        setIsAnalyzing(true);
        const res = await fetch("/api/analyze-handwriting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            strokes: [],
            raw_text: conceptPrompt,
            lang: targetLanguage,
            voice: targetVoice,
            tts: true,
            width: canvasRef.current ? Math.round(canvasRef.current.width) : 800,
            height: canvasRef.current ? Math.round(canvasRef.current.height) : 600,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.chunks && data.chunks.length > 0) {
            onProcessSuccess(data.chunks, { replace: false });
          }
        }
      } catch (err) {
        console.warn("Shape remote TTS error:", err);
      } finally {
        setIsAnalyzing(false);
        onStatusChange?.(null);
      }
    }
  };

  // Convert handwritten strokes / notes to Sign Language
  const triggerHandwritingAnalysis = async () => {
    if (strokesRef.current.length === 0) return;

    // Abort previous in-flight request so requests don't queue or overlap
    if (handwritingAbortRef.current) {
      handwritingAbortRef.current.abort();
    }
    const abortController = new AbortController();
    handwritingAbortRef.current = abortController;

    setIsAnalyzing(true);

    // Format strokes into Google Input Tools format: [ [ [x1, x2..], [y1, y2..], [t1, t2..] ], ... ]
    const formattedStrokes = strokesRef.current
      .filter((s) => s.tool === "pen" || s.tool === "brush")
      .map((s) => {
        const xs = s.points.map((p) => Math.round(p.x));
        const ys = s.points.map((p) => Math.round(p.y));
        const ts = s.points.map((p) => p.t);
        return [xs, ys, ts];
      });

    // Also include any stamped symbols
    const stampedTexts = strokesRef.current
      .filter((s) => s.text)
      .map((s) => s.text)
      .join(" ");

    try {
      const res = await fetch("/api/analyze-handwriting", {
        method: "POST",
        signal: abortController.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strokes: formattedStrokes,
          raw_text: stampedTexts,
          lang: targetLanguage,
          voice: targetVoice,
          tts: ttsEnabled,
          width: canvasRef.current ? Math.round(canvasRef.current.width) : 800,
          height: canvasRef.current ? Math.round(canvasRef.current.height) : 600,
        }),
      });

      if (!res.ok) throw new Error("Failed to analyze whiteboard");

      const data = await res.json();
      if (data.success && data.chunks && data.chunks.length > 0) {
        // Enqueue to avatar to sign seamlessly without blocking popups
        onProcessSuccess(data.chunks, { replace: false });
      } else if (stampedTexts) {
        // Fallback: sign stamped equations/symbols locally if handwriting recognition had no clean text
        const clientChunk = await generateClientEducationalChunk(stampedTexts, "Board Equation");
        if (clientChunk.sigml && clientChunk.sigml.length > 0) {
          onProcessSuccess([clientChunk], { replace: false });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn("Handwriting analysis error:", err);
        // Instant client-side fallback if equations were stamped
        if (stampedTexts) {
          try {
            const clientChunk = await generateClientEducationalChunk(stampedTexts, "Board Equation");
            if (clientChunk.sigml && clientChunk.sigml.length > 0) {
              onProcessSuccess([clientChunk], { replace: false });
            }
          } catch (_) {}
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`absolute inset-0 z-20 flex flex-col ${
      isPdfAnnotateMode
        ? "bg-slate-950/40 backdrop-blur-sm"
        : boardTheme === "green"
          ? "bg-[#0b2518]"
          : boardTheme === "dark"
            ? "bg-[#0f172a]"
            : "bg-[#f8fafc]"
    } pt-14 sm:pt-20`}>
      {/* Top Floating Whiteboard Equipment Toolbar */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-2.5 sm:px-4 py-2 bg-slate-900/95 border-b border-white/10 shadow-2xl backdrop-blur-xl max-w-full overflow-x-auto no-scrollbar">
        {/* Left: Tools (Scroll PDF, Pen, Type, Brush, Eraser, Shapes) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Scroll PDF (Pan Tool) - Available in PDF mode to freely scroll/interact */}
          {isPdfAnnotateMode && (
            <button
              onClick={() => setCurrentTool("pan")}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTool === "pan"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300"
                  : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
              title="Scroll PDF: lets you freely swipe, scroll, click, and interact with the PDF document"
            >
              <i className="fas fa-hand-paper"></i>
              <span>Scroll PDF</span>
            </button>
          )}

          {/* Pen */}
          <button
            onClick={() => setCurrentTool("pen")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === "pen"
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
            title="Smooth Pen"
          >
            <i className="fas fa-pen"></i>
            <span>Pen</span>
          </button>

          {/* Type Button with Logo right beside Pen */}
          <button
            onClick={() => setCurrentTool("type")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === "type"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-300"
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
            title="Type Text Note (Click anywhere on board or PDF to spawn draggable text)"
          >
            <i className="fas fa-font"></i>
            <span>Type</span>
          </button>

          {/* Brush / Highlighter */}
          <button
            onClick={() => setCurrentTool("brush")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === "brush"
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
            title="Highlighter / Brush"
          >
            <i className="fas fa-paint-brush"></i>
            <span>Highlighter</span>
          </button>

          {/* Eraser with Dedicated Large Size Indicator */}
          <button
            onClick={() => setCurrentTool("eraser")}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              currentTool === "eraser"
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-300"
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
            title="Large Chalkboard Eraser (Visible Head)"
          >
            <i className="fas fa-eraser"></i>
            <span>Eraser ({eraserSize}px)</span>
          </button>

          {/* Dynamic Size Selector: Font Size (when Type active), Eraser Size (when eraser active), or Pen Size */}
          {currentTool === "type" ? (
            <div className="flex items-center gap-1 bg-purple-950/40 px-2 py-1 rounded-lg border border-purple-500/30">
              <span className="text-[10px] text-purple-300 font-bold uppercase mr-1">Font Size:</span>
              {[
                { label: "S", size: 18 },
                { label: "M", size: 24 },
                { label: "L", size: 32 },
                { label: "XL", size: 44 },
              ].map(({ label, size }) => (
                <button
                  key={size}
                  onClick={() => setTypeFontSize(size)}
                  className={`px-2 py-0.5 rounded text-xs transition-all cursor-pointer ${
                    typeFontSize === size 
                      ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/40" 
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                  title={`Font size ${size}px`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : currentTool === "eraser" ? (
            <div className="flex items-center gap-1 bg-rose-950/40 px-2 py-1 rounded-lg border border-rose-500/30">
              <span className="text-[10px] text-rose-300 font-bold uppercase mr-1">Eraser Size:</span>
              {[
                { label: "Medium", size: 35 },
                { label: "Large", size: 55 },
                { label: "XL", size: 90 },
              ].map(({ label, size }) => (
                <button
                  key={size}
                  onClick={() => setEraserSize(size)}
                  className={`px-2 py-0.5 rounded text-xs transition-all cursor-pointer ${
                    eraserSize === size 
                      ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40" 
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                  title={`${label} Eraser (${size}px)`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Pen Size:</span>
              {[2, 4, 8].map((size) => (
                <button
                  key={size}
                  onClick={() => setStrokeWidth(size)}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                    strokeWidth === size ? "bg-white/20 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: size * 1.5, height: size * 1.5 }}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="h-6 w-px bg-white/15 mx-1" />

          {/* Maths & Physics Tools: Click directly from equipments translates to ISL */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 flex-wrap">
            <span className="text-[10px] text-indigo-300 font-bold uppercase px-1">Math & Physics:</span>
            
            {/* Coordinate System */}
            <button
              onClick={() => selectShapeTool("axes")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "axes" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Cartesian Coordinate Axes (X-Y Plane) — Translates to Sign Language"
            >
              📈 (X, Y)
            </button>

            {/* Vector Arrow */}
            <button
              onClick={() => selectShapeTool("arrow")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "arrow" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Vector Arrow (Force, Velocity) — Translates to Sign Language"
            >
              ➔ Vector
            </button>

            {/* Circle */}
            <button
              onClick={() => selectShapeTool("circle")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "circle" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Circle / Orbit — Translates to Sign Language"
            >
              ⭕ Circle
            </button>

            {/* Rectangle / Block */}
            <button
              onClick={() => selectShapeTool("rect")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "rect" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Rectangle / Mass Block — Translates to Sign Language"
            >
              ▭ Block
            </button>

            {/* Triangle */}
            <button
              onClick={() => selectShapeTool("triangle")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "triangle" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Triangle / Optics Prism — Translates to Sign Language"
            >
              📐 Triangle
            </button>

            {/* Spring / Wave */}
            <button
              onClick={() => selectShapeTool("wave")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "wave" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Physics Oscillation Wave / Spring — Translates to Sign Language"
            >
              〰️ Wave
            </button>

            {/* Angle Arc */}
            <button
              onClick={() => selectShapeTool("angle")}
              className={`px-2 py-1 rounded text-xs transition-all cursor-pointer ${
                currentTool === "angle" ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/40" : "text-slate-300 hover:bg-white/10"
              }`}
              title="Angle θ — Translates to Sign Language"
            >
              ∠ θ
            </button>
          </div>
        </div>

        {/* Center/Right: Colors, Simultaneous Auto-Sign, and Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Color Palette */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            {PRESET_COLORS.map((col) => (
              <button
                key={col.value}
                onClick={() => setStrokeColor(col.value)}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border transition-all cursor-pointer ${
                  strokeColor.toLowerCase() === col.value.toLowerCase()
                    ? "scale-125 border-white ring-2 ring-emerald-400"
                    : "border-white/20 hover:scale-110"
                }`}
                style={{ backgroundColor: col.value }}
                title={col.name}
              />
            ))}
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full cursor-pointer bg-transparent border-0 p-0 overflow-hidden"
              title="Custom Color Picker"
            />
          </div>

          {/* Board Theme */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setBoardTheme("dark")}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                boardTheme === "dark" ? "bg-slate-700 text-white font-bold shadow-sm ring-1 ring-slate-400/50" : "text-slate-400 hover:text-white"
              }`}
              title="Slate Blackboard (First Priority)"
            >
              <span>⬛ Slate</span>
            </button>
            <button
              onClick={() => setBoardTheme("green")}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                boardTheme === "green" ? "bg-emerald-800 text-white font-bold shadow-sm ring-1 ring-emerald-400/50" : "text-slate-400 hover:text-white"
              }`}
              title="Green Chalkboard"
            >
              <span>🟢 Chalkboard</span>
            </button>
            <button
              onClick={() => setBoardTheme("white")}
              className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                boardTheme === "white" ? "bg-slate-200 text-slate-900 font-bold shadow-sm" : "text-slate-400 hover:text-white"
              }`}
              title="Whiteboard"
            >
              <span>⬜ White</span>
            </button>
          </div>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Undo"
            >
              <i className="fas fa-undo text-xs"></i>
            </button>
            <button
              onClick={handleRedo}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-all cursor-pointer"
              title="Redo"
            >
              <i className="fas fa-redo text-xs"></i>
            </button>
            <button
              onClick={handleClear}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              title="Clear Whiteboard"
            >
              <i className="fas fa-trash-alt text-xs"></i>
              <span>Clear</span>
            </button>
          </div>

          {/* Simultaneous Auto-Sign Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoSignEnabled(!autoSignEnabled)}
              className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                autoSignEnabled
                  ? "bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
              }`}
              title="Simultaneous Auto-Sign: converts writing to sign language in real-time as you write"
            >
              <span className={`w-2 h-2 rounded-full ${autoSignEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`} />
              <span>{autoSignEnabled ? "Auto-Sign: Live" : "Auto-Sign: Off"}</span>
            </button>

            <button
              onClick={triggerHandwritingAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Analyze handwritten notes on board and convert to Indian Sign Language"
            >
              {isAnalyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Signing...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sparkles"></i>
                  <span>✨ Convert to Sign</span>
                </>
              )}
            </button>
          </div>

          {/* PDF Page Navigation & Zoom Controls */}
          {isPdfAnnotateMode && (
            <div className="flex items-center gap-1.5 bg-sky-950/70 border border-sky-500/40 px-2.5 py-1 rounded-xl shadow-md">
              <span className="text-[11px] text-sky-300 font-bold uppercase mr-1">PDF:</span>
              <button
                onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                disabled={pdfPage <= 1}
                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center cursor-pointer text-xs"
                title="Previous PDF Page"
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="text-xs font-mono font-bold text-white px-1">
                P.{pdfPage}
              </span>
              <button
                onClick={() => setPdfPage((p) => p + 1)}
                className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer text-xs"
                title="Next PDF Page"
              >
                <i className="fas fa-chevron-right"></i>
              </button>
              <div className="h-4 w-px bg-white/20 mx-0.5" />
              <button
                onClick={() => setPdfZoom((z) => Math.max(50, z - 25))}
                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-sky-200 flex items-center justify-center"
                title="Zoom Out"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-sky-200">{pdfZoom}%</span>
              <button
                onClick={() => setPdfZoom((z) => Math.min(200, z + 25))}
                className="w-5 h-5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-sky-200 flex items-center justify-center"
                title="Zoom In"
              >
                +
              </button>
            </div>
          )}

          {/* PDF Annotation Mode Status & Mode Switcher */}
          {isPdfAnnotateMode && (
            <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-xl shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-bold text-indigo-200">
                📄 PDF In-Place Annotation
              </span>
              {onTogglePdfMode && (
                <button
                  onClick={onTogglePdfMode}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  title="Switch back to full green chalkboard"
                >
                  <i className="fas fa-chalkboard"></i>
                  <span>Switch to Chalkboard</span>
                </button>
              )}
            </div>
          )}
          {!isPdfAnnotateMode && pdfUrl && onTogglePdfMode && (
            <button
              onClick={onTogglePdfMode}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-md border border-indigo-400/40"
              title="Annotate directly on the opened PDF document"
            >
              <i className="fas fa-file-pdf"></i>
              <span>Annotate on PDF</span>
            </button>
          )}

          {/* Close Whiteboard */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer ml-1"
            title="Close Whiteboard"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {/* Maths & Physics Quick Stamp Drawer */}
      <div className="relative z-20 flex items-center gap-1.5 px-4 py-1.5 bg-black/40 border-b border-white/5 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-emerald-400 font-bold whitespace-nowrap mr-1">
          Quick Formulas (Auto-Signed on Click):
        </span>
        {MATH_PHYSICS_SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => handleStampSymbol(sym)}
            className="px-2.5 py-0.5 rounded-md bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-white text-xs font-mono whitespace-nowrap transition-all cursor-pointer active:scale-95"
            title={`Insert ${sym} and translate to Sign Language`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef} 
        className="relative flex-1 w-full h-full min-h-0 overflow-hidden touch-none select-none"
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onPointerLeave={() => {
          if (eraserCursorRef.current) {
            eraserCursorRef.current.style.transform = 'translate3d(-9999px, -9999px, 0)';
          }
        }}
      >
        {/* Underneath PDF Viewer if in PDF In-Place Annotation Mode */}
        {isPdfAnnotateMode && pdfUrl && (
          <iframe
            key={`pdf_frame_${pdfPage}_${pdfZoom}`}
            src={`${pdfUrl}#page=${pdfPage}&zoom=${pdfZoom}&toolbar=1&navpanes=0`}
            className="absolute inset-0 w-full h-full border-none bg-white z-0 pointer-events-auto"
            title="PDF Document"
          />
        )}

        {/* Floating Mode Toggle for PDF Mode: Instant switch between Scroll PDF and Draw/Annotate */}
        {isPdfAnnotateMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/95 border border-white/20 shadow-2xl backdrop-blur-xl">
            <button
              onClick={() => setCurrentTool("pan")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                currentTool === "pan"
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-300 scale-105"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              title="Scroll PDF freely with mouse wheel, drag, or touch"
            >
              <span>🖐️</span>
              <span>Scroll PDF</span>
            </button>
            <button
              onClick={() => setCurrentTool("pen")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                currentTool !== "pan"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105"
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
              title="Draw, underline, or annotate on top of PDF"
            >
              <span>✏️</span>
              <span>Draw / Annotate</span>
            </button>
          </div>
        )}

        {/* Draggable Text Blocks (Type Tool) */}
        {textBlocks.map((block) => (
          <div
            key={block.id}
            style={{
              position: 'absolute',
              left: block.x,
              top: block.y,
              zIndex: 35
            }}
            className="group flex flex-col rounded-xl border border-white/25 bg-slate-900/95 shadow-2xl backdrop-blur-xl p-2 min-w-[220px] max-w-[420px] transition-shadow"
          >
            {/* Drag Handle & Font / Sign Controls */}
            <div
              onPointerDown={(e) => handleBlockDragStart(e, block.id)}
              className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                <i className="fas fa-grip-vertical text-purple-400"></i>
                <span>Text Note</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Font Size decrease/increase */}
                <button
                  onClick={() => {
                    const next = block.fontSize > 16 ? block.fontSize - 4 : 14;
                    setTextBlocks(prev => prev.map(b => b.id === block.id ? { ...b, fontSize: next } : b));
                  }}
                  className="w-5 h-5 rounded hover:bg-white/10 text-slate-300 text-[10px] flex items-center justify-center cursor-pointer font-bold"
                  title="Decrease Font Size"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono text-purple-300 font-bold px-0.5">{block.fontSize}px</span>
                <button
                  onClick={() => {
                    const next = block.fontSize < 48 ? block.fontSize + 4 : 52;
                    setTextBlocks(prev => prev.map(b => b.id === block.id ? { ...b, fontSize: next } : b));
                  }}
                  className="w-5 h-5 rounded hover:bg-white/10 text-slate-300 text-[10px] flex items-center justify-center cursor-pointer font-bold"
                  title="Increase Font Size"
                >
                  A+
                </button>
                {/* Sign Button */}
                <button
                  onClick={() => signTextBlock(block.text)}
                  className="px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ml-1 shadow-sm"
                  title="Translate typed text note to Indian Sign Language"
                >
                  <i className="fas fa-hands-asl-interpreting"></i>
                  <span>Sign</span>
                </button>
                {/* Delete button */}
                <button
                  onClick={() => setTextBlocks(prev => prev.filter(b => b.id !== block.id))}
                  className="w-5 h-5 rounded hover:bg-red-500/20 text-red-400 text-xs flex items-center justify-center cursor-pointer ml-0.5"
                  title="Delete Text Note"
                >
                  <i className="fas fa-trash-alt text-[10px]"></i>
                </button>
              </div>
            </div>

            {/* Editable Text Area */}
            <textarea
              value={block.text}
              autoFocus
              rows={Math.max(1, block.text.split('\n').length)}
              onChange={(e) => {
                const val = e.target.value;
                setTextBlocks(prev => prev.map(b => b.id === block.id ? { ...b, text: val } : b));
                if (autoSignEnabled) {
                  if (autoSignTimerRef.current) clearTimeout(autoSignTimerRef.current);
                  autoSignTimerRef.current = setTimeout(() => {
                    signTextBlock(val);
                  }, 1200);
                }
              }}
              placeholder="Type note or equation here..."
              style={{
                fontSize: `${block.fontSize}px`,
                color: block.color || '#ffffff',
                lineHeight: 1.35
              }}
              className="w-full bg-transparent border-none outline-none resize-none font-sans font-medium placeholder-white/30 px-1 py-0.5"
            />
          </div>
        ))}

        {/* Live Visible Circular Eraser Cursor Ring Following Pointer — Direct DOM transform, ZERO React re-renders! */}
        <div
          ref={eraserCursorRef}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/95 bg-white/25 shadow-[0_0_15px_rgba(255,255,255,0.7)] z-40 backdrop-blur-[1px] transition-none"
          style={{
            display: currentTool === "eraser" ? "block" : "none",
            width: eraserSize,
            height: eraserSize,
            left: 0,
            top: 0,
            transform: 'translate3d(-9999px, -9999px, 0)'
          }}
        >
          {/* Center crosshair dot for exact precision */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm" />
          </div>
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            if (eraserCursorRef.current) {
              eraserCursorRef.current.style.transform = 'translate3d(-9999px, -9999px, 0)';
            }
          }}
          className={`w-full h-full select-none block absolute inset-0 z-10 ${
            currentTool === "pan" ? "pointer-events-none" : "pointer-events-auto"
          } ${
            currentTool === "eraser" 
              ? "cursor-none" 
              : currentTool === "type" 
                ? "cursor-text" 
                : currentTool === "pan"
                  ? "cursor-grab"
                  : "cursor-crosshair"
          }`}
          style={{ touchAction: currentTool === "pan" ? "auto" : "none" }}
        />
      </div>
    </div>
  );
}
