"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCw, X } from "lucide-react";

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };
type Handle = "move" | "tl" | "tr" | "br" | "bl" | "t" | "r" | "b" | "l";
type Drag = { handle: Handle; start: Point; rect: Rect };

const MIN = 24;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
function fitRect(aspect: number | null, W: number, H: number): Rect {
  if (!aspect) return { x: W * .05, y: H * .05, w: W * .9, h: H * .9 };
  const w = Math.min(W * .9, H * .9 * aspect), h = w / aspect;
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}

export default function RectCropDialog({ open, image, onCancel, onDone, targetAspect }: {
  open: boolean; image: string | null; onCancel: () => void; onDone: (image: string) => void; targetAspect?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef({ x: 0, y: 0, scale: 1, dpr: 1 });
  const dragRef = useRef<Drag | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [ratioKey, setRatioKey] = useState("free");
  const [error, setError] = useState("");
  const validTarget = Number.isFinite(targetAspect) && (targetAspect ?? 0) > 0;
  const ratios = [
    { key: "free", label: "Free", value: null as number | null },
    ...(validTarget ? [{ key: "output", label: "Output size", value: targetAspect as number }] : []),
    { key: "1:1", label: "1:1", value: 1 },
    { key: "7:9", label: "7:9 (35×45)", value: 7 / 9 },
    { key: "3:4", label: "3:4", value: 3 / 4 },
    { key: "4:3", label: "4:3", value: 4 / 3 },
  ];
  const ratio = ratios.find(r => r.key === ratioKey)?.value ?? null;

  useEffect(() => {
    if (!open || !image) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const src = document.createElement("canvas");
      src.width = img.naturalWidth; src.height = img.naturalHeight;
      const ctx = src.getContext("2d");
      if (!ctx) { setError("Could not open this image."); return; }
      ctx.drawImage(img, 0, 0); sourceRef.current = src;
      setSize({ width: src.width, height: src.height });
      const key = validTarget ? "output" : "free";
      setRatioKey(key);
      setRect(fitRect(key === "output" ? targetAspect as number : null, src.width, src.height));
      setError("");
    };
    img.onerror = () => setError("Could not open this image. Please choose a JPG or PNG photo.");
    img.src = image;
    return () => { cancelled = true; };
  }, [open, image]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, source = sourceRef.current;
    if (!canvas || !source || !size.width || !size.height) return;
    const box = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(1, Math.round(box.width * dpr)), ch = Math.max(1, Math.round(box.height * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#e2e8f0"; ctx.fillRect(0, 0, cw, ch);
    const scale = Math.min(cw / source.width, ch / source.height);
    const dw = source.width * scale, dh = source.height * scale;
    const ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    viewRef.current = { x: ox, y: oy, scale, dpr };
    ctx.drawImage(source, ox, oy, dw, dh);
    const rx = ox + rect.x * scale, ry = oy + rect.y * scale, rw = rect.w * scale, rh = rect.h * scale;
    ctx.fillStyle = "rgba(15,23,42,.55)";
    ctx.fillRect(ox, oy, dw, ry - oy); ctx.fillRect(ox, ry + rh, dw, oy + dh - ry - rh);
    ctx.fillRect(ox, ry, rx - ox, rh); ctx.fillRect(rx + rw, ry, ox + dw - rx - rw, rh);
    ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.lineWidth = dpr; ctx.beginPath();
    for (let i = 1; i < 3; i++) {
      ctx.moveTo(rx + rw * i / 3, ry); ctx.lineTo(rx + rw * i / 3, ry + rh);
      ctx.moveTo(rx, ry + rh * i / 3); ctx.lineTo(rx + rw, ry + rh * i / 3);
    }
    ctx.stroke(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2 * dpr; ctx.strokeRect(rx, ry, rw, rh);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0e7490"; ctx.lineWidth = 2.5 * dpr;
    const corners = [{ x: rx, y: ry }, { x: rx + rw, y: ry }, { x: rx + rw, y: ry + rh }, { x: rx, y: ry + rh }];
    corners.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 8 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    if (!ratio) {
      const mids = [{ x: rx + rw / 2, y: ry }, { x: rx + rw, y: ry + rh / 2 }, { x: rx + rw / 2, y: ry + rh }, { x: rx, y: ry + rh / 2 }];
      mids.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    }
  }, [rect, size, ratio]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [open, draw]);

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current; if (!canvas) return null;
    const box = canvas.getBoundingClientRect(), v = viewRef.current, factor = canvas.width / Math.max(1, box.width);
    return { x: ((e.clientX - box.left) * factor - v.x) / v.scale, y: ((e.clientY - box.top) * factor - v.y) / v.scale };
  };
  const hitTest = (p: Point): Handle | null => {
    const reach = 22 * viewRef.current.dpr / viewRef.current.scale, { x, y, w, h } = rect;
    const near = (q: Point) => Math.hypot(p.x - q.x, p.y - q.y) <= reach;
    if (near({ x, y })) return "tl";
    if (near({ x: x + w, y })) return "tr";
    if (near({ x: x + w, y: y + h })) return "br";
    if (near({ x, y: y + h })) return "bl";
    if (!ratio) {
      if (near({ x: x + w / 2, y })) return "t";
      if (near({ x: x + w, y: y + h / 2 })) return "r";
      if (near({ x: x + w / 2, y: y + h })) return "b";
      if (near({ x, y: y + h / 2 })) return "l";
    }
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h ? "move" : null;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointFromEvent(e); if (!p) return;
    const handle = hitTest(p); if (!handle) return;
    dragRef.current = { handle, start: p, rect: { ...rect } };
    canvasRef.current?.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current; if (!drag) return;
    const p = pointFromEvent(e); if (!p) return;
    const { width: W, height: H } = size, r = drag.rect;
    if (drag.handle === "move") {
      setRect({ ...r, x: clamp(r.x + p.x - drag.start.x, 0, W - r.w), y: clamp(r.y + p.y - drag.start.y, 0, H - r.h) }); return;
    }
    if (drag.handle.length === 2) {
      const right = drag.handle.includes("r"), bottom = drag.handle.includes("b");
      const anchor = { x: right ? r.x : r.x + r.w, y: bottom ? r.y : r.y + r.h };
      const maxW = right ? W - anchor.x : anchor.x, maxH = bottom ? H - anchor.y : anchor.y;
      let w = Math.max(MIN, (right ? 1 : -1) * (p.x - anchor.x));
      let h = Math.max(MIN, (bottom ? 1 : -1) * (p.y - anchor.y));
      if (ratio) { w = Math.min(Math.max(w, h * ratio), maxW, maxH * ratio); h = w / ratio; }
      else { w = Math.min(w, maxW); h = Math.min(h, maxH); }
      setRect({ x: right ? anchor.x : anchor.x - w, y: bottom ? anchor.y : anchor.y - h, w, h }); return;
    }
    const next = { ...r };
    if (drag.handle === "l") { const x = clamp(p.x, 0, r.x + r.w - MIN); next.w = r.x + r.w - x; next.x = x; }
    if (drag.handle === "r") next.w = clamp(p.x, r.x + MIN, W) - r.x;
    if (drag.handle === "t") { const y = clamp(p.y, 0, r.y + r.h - MIN); next.h = r.y + r.h - y; next.y = y; }
    if (drag.handle === "b") next.h = clamp(p.y, r.y + MIN, H) - r.y;
    setRect(next);
  };
  const rotate = () => {
    const src = sourceRef.current; if (!src) return;
    const out = document.createElement("canvas"); out.width = src.height; out.height = src.width;
    const ctx = out.getContext("2d"); if (!ctx) return;
    ctx.translate(out.width, 0); ctx.rotate(Math.PI / 2); ctx.drawImage(src, 0, 0);
    sourceRef.current = out; setSize({ width: out.width, height: out.height }); setRect(fitRect(ratio, out.width, out.height));
  };
  const save = () => {
    const src = sourceRef.current; if (!src) return;
    try {
      setError("");
      const out = document.createElement("canvas"); out.width = Math.max(1, Math.round(rect.w)); out.height = Math.max(1, Math.round(rect.h));
      const ctx = out.getContext("2d"); if (!ctx) throw new Error("Cannot prepare the cropped image.");
      ctx.drawImage(src, rect.x, rect.y, rect.w, rect.h, 0, 0, out.width, out.height);
      onDone(out.toDataURL("image/jpeg", .96));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not crop this image."); }
  };
  if (!open || !image) return null;
  return (
    <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true">
      <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 bg-gradient-to-r from-sky-700 to-cyan-600 px-5 py-4 text-white">
          <div><h2 className="text-lg font-black sm:text-xl">Crop Photo</h2><p className="mt-1 text-xs text-white/80">Drag the crop box to move it and drag the corners to resize.</p></div>
          <button type="button" onClick={onCancel} aria-label="Cancel crop" className="rounded-xl p-2 hover:bg-white/15"><X size={20}/></button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,1fr)_230px] md:p-5">
          <div className="min-h-[300px] rounded-2xl border bg-slate-100 sm:min-h-[440px]"><canvas ref={canvasRef} className="h-full min-h-[300px] w-full touch-none rounded-2xl sm:min-h-[440px]" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}/></div>
          <aside className="space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">Shape</p><div className="mt-2 flex flex-wrap gap-2">{ratios.map(r => <button key={r.key} type="button" onClick={() => { setRatioKey(r.key); setRect(fitRect(r.value, size.width, size.height)); }} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${ratioKey === r.key ? "border-cyan-600 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600"}`}>{r.label}</button>)}</div><p className="mt-2 text-[11px] leading-4 text-slate-500">{ratio ? "Shape is locked. Use the corners to resize." : "Free shape: corners and edges both work."}</p></div>
            <button type="button" onClick={rotate} className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold hover:bg-slate-50"><RotateCw size={16}/> Rotate 90°</button>
            <button type="button" onClick={() => setRect(fitRect(ratio, size.width, size.height))} className="w-full rounded-xl border px-4 py-3 text-sm font-bold hover:bg-slate-50">Reset box</button>
            <button type="button" onClick={() => onDone(image)} className="w-full rounded-xl border border-dashed px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50">Skip: use full photo</button>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </aside>
        </div>
        <footer className="flex flex-col-reverse justify-between gap-2 border-t bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-5"><button type="button" onClick={onCancel} className="rounded-xl border px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={!size.width} onClick={save} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-6 py-3 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-50"><Check size={17}/> Done: use cropped photo</button></footer>
      </div>
    </div>
  );
}
