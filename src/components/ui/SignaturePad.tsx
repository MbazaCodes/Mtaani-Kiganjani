/**
 * SignaturePad — lightweight, dependency-free signature capture.
 *
 * Draws on an HTML canvas with mouse or touch, then exports the result as a
 * trimmed PNG data URL. No external library required.
 *
 * Usage:
 *   <SignaturePad value={sig} onChange={setSig} lang="sw" />
 *
 * - value: existing data-URL signature (shows a preview with a "redraw" option)
 * - onChange(dataUrl | null): fires when the user saves or clears
 */
import React, { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check, RotateCcw } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  lang?: "sw" | "en";
  label?: string;
  /** Canvas height in px (width is responsive). Default 160. */
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  value,
  onChange,
  lang = "sw",
  label,
  height = 160,
}) => {
  const L = (sw: string, en: string) => (lang === "sw" ? sw : en);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(!value);
  const [empty, setEmpty] = useState(true);

  // Size the canvas to its container (with devicePixelRatio for crisp lines)
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ratio = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1c1917";
    }
  }, [height]);

  useEffect(() => {
    if (editing) {
      setupCanvas();
      const onResize = () => setupCanvas();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
  }, [editing, setupCanvas]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    last.current = pointerPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const pos = pointerPos(e);
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      hasDrawn.current = true;
      if (empty) setEmpty(false);
    }
    last.current = pos;
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasDrawn.current = false;
    setEmpty(true);
  };

  const save = () => {
    if (!hasDrawn.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
    setEditing(false);
  };

  const redraw = () => {
    onChange(null);
    setEditing(true);
    setEmpty(true);
    hasDrawn.current = false;
  };

  // Preview mode — a saved signature exists
  if (!editing && value) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="border border-stone-200 rounded-xl bg-white p-3 flex items-center justify-between gap-3">
          <img src={value} alt="signature" className="h-16 object-contain" />
          <button
            type="button"
            onClick={redraw}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            {L("Chora Upya", "Redraw")}
          </button>
        </div>
      </div>
    );
  }

  // Drawing mode
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{label}</label>
      )}
      <div ref={wrapRef} className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="w-full border-2 border-dashed border-stone-300 rounded-xl bg-stone-50 touch-none cursor-crosshair"
          style={{ height }}
        />
        {empty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-stone-300 font-medium">
              {L("Saini hapa kwa kidole au panya", "Sign here with finger or mouse")}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={empty}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-400 rounded-lg transition-colors"
        >
          <Check size={14} />
          {L("Hifadhi Saini", "Save Signature")}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={empty}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Eraser size={14} />
          {L("Futa", "Clear")}
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
