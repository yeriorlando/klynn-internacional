import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check, PenTool } from "lucide-react";

interface DigitalSignatureCanvasProps {
  onSignatureChange: (base64: string | null) => void;
  width?: number;
  height?: number;
}

export function DigitalSignatureCanvas({
  onSignatureChange,
}: DigitalSignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Inicializar o ajustar el canvas con resolución nítida Retina/móvil
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;

    // Detectar modo oscuro para tinta con alto contraste
    const isDark = document.documentElement.classList.contains("dark");
    ctx.strokeStyle = isDark ? "#38bdf8" : "#0f172a";
  }, []);

  useEffect(() => {
    setupCanvas();

    // Reajustar cuando se termine de animar el modal o cambie el tamaño de ventana
    const timer = setTimeout(setupCanvas, 150);
    window.addEventListener("resize", setupCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", setupCanvas);
    };
  }, [setupCanvas]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si el navegador no soporta pointer capture
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Asegurar color de tinta correcto
    const isDark = document.documentElement.classList.contains("dark");
    ctx.strokeStyle = isDark ? "#38bdf8" : "#0f172a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignorar
      }
      if (hasSignature) {
        onSignatureChange(canvas.toDataURL("image/png"));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <PenTool className="h-3.5 w-3.5 text-primary" />
          <span>Firma Digital del Receptor</span>
          {hasSignature && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md">
              <Check className="h-2.5 w-2.5" /> Registrada
            </span>
          )}
        </div>
        {hasSignature && (
          <button
            type="button"
            onClick={clearCanvas}
            className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900 transition active:scale-95 cursor-pointer"
          >
            <Eraser className="h-3.5 w-3.5" /> Limpiar firma
          </button>
        )}
      </div>

      <div className="relative w-full rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 overflow-hidden shadow-inner touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-44 sm:h-36 cursor-crosshair rounded-xl bg-slate-50/50 dark:bg-slate-900/60 touch-none block"
          style={{ touchAction: "none" }}
        />
        
        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 font-bold gap-1 px-4 text-center">
            <PenTool className="h-5 w-5 opacity-40 animate-bounce" />
            <span>Firma aquí con el dedo o lápiz</span>
          </div>
        )}
        
        {/* Línea guía de firma */}
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 border-b border-dashed border-slate-300 dark:border-slate-700" />
      </div>
    </div>
  );
}
