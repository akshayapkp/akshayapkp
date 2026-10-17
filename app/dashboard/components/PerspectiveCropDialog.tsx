"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";

interface PerspectiveCropDialogProps {
  open: boolean;
  image: string | null;
  onCancel: () => void;
  onDone: (image: string) => void;
}

type Point = { x: number; y: number };
type Quad = { tl: Point; tr: Point; br: Point; bl: Point };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-10) throw new Error("These corners cannot form a valid crop. Please adjust them.");
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j++) a[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j++) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

function homographyFromQuad(q: Quad, width: number, height: number) {
  const src = [q.tl, q.tr, q.br, q.bl];
  const dst = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
  const matrix: number[][] = [], values: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i]; const { x: u, y: v } = dst[i];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); values.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]); values.push(v);
  }
  return [...solveLinearSystem(matrix, values), 1];
}
function mapPoint(h: number[], x: number, y: number): Point {
  const d = h[6] * x + h[7] * y + 1;
  return { x: (h[0] * x + h[1] * y + h[2]) / d, y: (h[3] * x + h[4] * y + h[5]) / d };
}
function warpPerspective(source: HTMLCanvasElement, quad: Quad, width: number, height: number) {
  const inputContext = source.getContext("2d", { willReadFrequently: true });
  if (!inputContext) throw new Error("Cannot read this image in the browser.");
  const input = inputContext.getImageData(0, 0, source.width, source.height);
  const outputCanvas = document.createElement("canvas"); outputCanvas.width = width; outputCanvas.height = height;
  const context = outputCanvas.getContext("2d");
  if (!context) throw new Error("Cannot prepare the corrected image.");
  const output = context.createImageData(width, height);
  const h = homographyFromQuad(quad, width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = mapPoint(h, x + 0.5, y + 0.5); const sx = p.x - 0.5, sy = p.y - 0.5;
    if (!Number.isFinite(sx) || !Number.isFinite(sy) || sx < 0 || sy < 0 || sx >= source.width - 1 || sy >= source.height - 1) continue;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    const dst = (y * width + x) * 4;
    for (let c = 0; c < 4; c++) {
      const p00 = input.data[(y0 * source.width + x0) * 4 + c];
      const p10 = input.data[(y0 * source.width + x0 + 1) * 4 + c];
      const p01 = input.data[((y0 + 1) * source.width + x0) * 4 + c];
      const p11 = input.data[((y0 + 1) * source.width + x0 + 1) * 4 + c];
      output.data[dst + c] = p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
    }
  }
  context.putImageData(output, 0, 0); return outputCanvas;
}
function isValidQuad(q: Quad) {
  const p = [q.tl, q.tr, q.br, q.bl]; let direction = 0;
  for (let i = 0; i < 4; i++) {
    const a = p[i], b = p[(i + 1) % 4], c = p[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1) return false;
    if (direction && Math.sign(cross) !== direction) return false;
    direction = Math.sign(cross);
  }
  return true;
}

export default function PerspectiveCropDialog({ open, image, onCancel, onDone }: PerspectiveCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<keyof Quad | null>(null);
  const viewRef = useRef({ x: 0, y: 0, width: 1, height: 1, scale: 1 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [quad, setQuad] = useState<Quad>({ tl: { x: 0, y: 0 }, tr: { x: 1, y: 0 }, br: { x: 1, y: 1 }, bl: { x: 0, y: 1 } });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !image) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const src = document.createElement("canvas"); src.width = img.naturalWidth; src.height = img.naturalHeight;
      const ctx = src.getContext("2d");
      if (!ctx) { setError("Could not open this image."); return; }
      ctx.drawImage(img, 0, 0); sourceRef.current = src; setSize({ width: src.width, height: src.height });
      setQuad({ tl: { x: src.width * 0.08, y: src.height * 0.08 }, tr: { x: src.width * 0.92, y: src.height * 0.08 }, br: { x: src.width * 0.92, y: src.height * 0.92 }, bl: { x: src.width * 0.08, y: src.height * 0.92 } }); setError("");
    };
    img.onerror = () => setError("Could not open this image. Please choose a JPG or PNG photo."); img.src = image;
    return () => { cancelled = true; };
  }, [open, image]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, source = sourceRef.current;
    if (!canvas || !source || !size.width || !size.height) return;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(rect.width * dpr)), ch = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#f1f5f9"; ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / source.width, ch / source.height), dw = source.width * scale, dh = source.height * scale;
    const x = (cw - dw) / 2, y = (ch - dh) / 2;
    ctx.drawImage(source, x, y, dw, dh); viewRef.current = { x, y, width: dw, height: dh, scale };
    const points = [quad.tl, quad.tr, quad.br, quad.bl].map(p => ({ x: x + p.x * scale, y: y + p.y * scale }));
    ctx.fillStyle = "rgba(14,165,233,.22)"; ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#0284c7"; ctx.lineWidth = 2 * dpr; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[2].x, points[2].y); ctx.moveTo(points[1].x, points[1].y); ctx.lineTo(points[3].x, points[3].y); ctx.stroke();
    const labels: (keyof Quad)[] = ["tl", "tr", "br", "bl"];
    points.forEach((p, i) => { ctx.beginPath(); ctx.fillStyle = "white"; ctx.strokeStyle = "#0369a1"; ctx.lineWidth = 3 * dpr; ctx.arc(p.x, p.y, 7 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.font = `bold ${10 * dpr}px sans-serif`; ctx.fillStyle = "#0f172a"; ctx.fillText(labels[i].toUpperCase(), p.x + 9 * dpr, p.y - 9 * dpr); });
  }, [quad, size]);
  useEffect(() => { draw(); }, [draw]);
  useEffect(() => { if (!open) return; window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [open, draw]);

  const pointFromPointer = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const rect = canvas.getBoundingClientRect(), v = viewRef.current, dpr = canvas.width / Math.max(1, rect.width);
    return { x: clamp(((e.clientX - rect.left) * dpr - v.x) / v.scale, 0, size.width), y: clamp(((e.clientY - rect.top) * dpr - v.y) / v.scale, 0, size.height) };
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointFromPointer(e); if (!p) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, rect.width);
    const handle = (Object.keys(quad) as (keyof Quad)[]).map(key => ({ key, distance: Math.hypot((p.x - quad[key].x) * viewRef.current.scale, (p.y - quad[key].y) * viewRef.current.scale) })).sort((a, b) => a.distance - b.distance)[0];
    if (handle && handle.distance <= 36) { dragRef.current = handle.key; canvas.setPointerCapture(e.pointerId); }
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return; const p = pointFromPointer(e); if (!p) return;
    const next = { ...quad, [dragRef.current]: p }; if (isValidQuad(next)) setQuad(next);
  };
  const resetCorners = () => setQuad({ tl: { x: size.width * 0.08, y: size.height * 0.08 }, tr: { x: size.width * 0.92, y: size.height * 0.08 }, br: { x: size.width * 0.92, y: size.height * 0.92 }, bl: { x: size.width * 0.08, y: size.height * 0.92 } });
  const save = () => {
    const src = sourceRef.current; if (!src) return;
    try {
      setError("");
      const width = Math.round(Math.min(6000, Math.max(2, Math.max(Math.hypot(quad.tr.x - quad.tl.x, quad.tr.y - quad.tl.y), Math.hypot(quad.br.x - quad.bl.x, quad.br.y - quad.bl.y)))));
      const height = Math.round(Math.min(6000, Math.max(2, Math.max(Math.hypot(quad.bl.x - quad.tl.x, quad.bl.y - quad.tl.y), Math.hypot(quad.br.x - quad.tr.x, quad.br.y - quad.tr.y)))));
      onDone(warpPerspective(src, quad, width, height).toDataURL("image/jpeg", 0.96));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not correct this image."); }
  };
  if (!open || !image) return null;
  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="perspective-crop-heading">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-sky-700 to-cyan-600 px-5 py-4 text-white"><div><h2 id="perspective-crop-heading" className="text-lg font-black sm:text-xl">Perspective Crop</h2><p className="mt-1 text-xs text-white/80">Drag the four corner handles to the edges of your photo or document.</p></div><button type="button" onClick={onCancel} aria-label="Cancel crop" className="rounded-xl p-2 hover:bg-white/15"><X size={20}/></button></header>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_220px] md:p-5"><div className="min-h-[300px] rounded-2xl border bg-slate-100 sm:min-h-[440px]"><canvas ref={canvasRef} className="h-full min-h-[300px] w-full touch-none rounded-2xl sm:min-h-[440px]" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}/></div><aside className="space-y-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">Four corner controls</p><p className="mt-1 text-xs leading-5 text-slate-500">Move TL, TR, BR and BL independently. The selected quadrilateral will be straightened.</p></div><button type="button" onClick={resetCorners} className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-slate-50"><RotateCcw size={16}/> Reset corners</button><div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-xs leading-5 text-cyan-900">Done returns the corrected image to the existing Photo Studio resize and download controls.</div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}</aside></div>
        <footer className="flex flex-col-reverse justify-between gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5"><button type="button" onClick={onCancel} className="rounded-xl border px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={!size.width} onClick={save} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-6 py-3 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-50"><Check size={17}/> Done — Use cropped photo</button></footer>
      </div>
    </div>
  );
}
