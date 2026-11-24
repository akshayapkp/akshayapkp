"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Download, FileImage, FileText, Printer, RotateCcw } from "lucide-react";

type Props = { image: string | null; onCropAgain: () => void };
type Size = { label: string; width: number; height: number };
type Paper = "A4" | "6x4";
type Orientation = "portrait" | "landscape" | "best";
type Guides = "dashed" | "corners" | "none";

const SIZES: Size[] = [
  { label: "PKP Existing Size (31 × 41 mm)", width: 31, height: 41 },
  { label: "Passport Photo (35 × 45 mm)", width: 35, height: 45 },
  { label: "32 × 42 mm", width: 32, height: 42 },
  { label: "2 × 2 inch (51 × 51 mm)", width: 51, height: 51 },
  { label: "30 × 40 mm", width: 30, height: 40 },
  { label: "40 × 50 mm", width: 40, height: 50 },
];
const PAPER_MM: Record<Paper, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  "6x4": { width: 152.4, height: 101.6 },
};
const BACKGROUNDS = [
  ["Original", "original"], ["White", "#ffffff"], ["Light Grey", "#e5e7eb"],
  ["Light Blue", "#dbeafe"], ["Blue", "#2563eb"], ["Cream", "#fff7e6"],
  ["Red", "#dc2626"], ["Transparent", "transparent"],
] as const;

function mmPx(mm: number, dpi: number) { return Math.max(1, Math.round((mm / 25.4) * dpi)); }
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The selected photo could not be opened."));
    img.src = src;
  });
}
function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
async function embedDpiMetadata(blob: Blob, dpi: number, mime: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (mime === "image/jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return blob;
    let app0 = -1;
    for (let i = 2; i < Math.min(bytes.length - 10, 64); i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe0 && String.fromCharCode(...bytes.slice(i + 4, i + 9)) === "JFIF\\0") { app0 = i; break; }
    }
    if (app0 >= 0) {
      bytes[app0 + 11] = 1;
      bytes[app0 + 12] = (dpi >> 8) & 255; bytes[app0 + 13] = dpi & 255;
      bytes[app0 + 14] = (dpi >> 8) & 255; bytes[app0 + 15] = dpi & 255;
      return new Blob([bytes], { type: mime });
    }
    const segment = new Uint8Array([0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x01,(dpi>>8)&255,dpi&255,(dpi>>8)&255,dpi&255,0,0]);
    const out = new Uint8Array(bytes.length + segment.length); out.set(bytes.slice(0,2)); out.set(segment,2); out.set(bytes.slice(2),2+segment.length);
    return new Blob([out], { type: mime });
  }
  if (mime === "image/png" && bytes.length > 33) {
    const ppm = Math.round(dpi / 0.0254);
    const data = new Uint8Array(9);
    const view = new DataView(data.buffer);
    view.setUint32(0, ppm); view.setUint32(4, ppm); data[8] = 1;
    const type = new Uint8Array([0x70,0x48,0x59,0x73]);
    const crcInput = new Uint8Array(type.length + data.length); crcInput.set(type); crcInput.set(data,4);
    const chunk = new Uint8Array(21); const chunkView = new DataView(chunk.buffer);
    chunkView.setUint32(0,9); chunk.set(type,4); chunk.set(data,8); chunkView.setUint32(17,crc32(crcInput));
    const insertAt = 33;
    const out = new Uint8Array(bytes.length + chunk.length); out.set(bytes.slice(0,insertAt)); out.set(chunk,insertAt); out.set(bytes.slice(insertAt),insertAt+chunk.length);
    return new Blob([out], { type: mime });
  }
  return blob;
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function PassportPhotoEnhancements({ image, onCropAgain }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [customW, setCustomW] = useState("35");
  const [customH, setCustomH] = useState("45");
  const [customSize, setCustomSize] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<Orientation>("best");
  const [copies, setCopies] = useState(8);
  const [fillSheet, setFillSheet] = useState(false);
  const [placement, setPlacement] = useState<"top-left" | "center">("top-left");
  const [margin, setMargin] = useState(3);
  const [border, setBorder] = useState(2);
  const [guides, setGuides] = useState<Guides>("dashed");
  const [outline, setOutline] = useState(true);
  const [bg, setBg] = useState("original");
  const [customHex, setCustomHex] = useState("#ffffff");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [shadows, setShadows] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoAdjusted, setAutoAdjusted] = useState(false);

  const selectedSize = customSize
    ? { label: "Custom", width: Math.max(10, Math.min(100, Number(customW) || 35)), height: Math.max(10, Math.min(100, Number(customH) || 45)) }
    : SIZES[sizeIndex];
  const page = PAPER_MM[paper];
  const portraitFit = Math.floor((page.width - 2 * margin + border) / (selectedSize.width + border)) *
    Math.floor((page.height - 2 * margin + border) / (selectedSize.height + border));
  const landscapeFit = Math.floor((page.height - 2 * margin + border) / (selectedSize.width + border)) *
    Math.floor((page.width - 2 * margin + border) / (selectedSize.height + border));
  const bestLandscape = landscapeFit > portraitFit;
  const pageW = orientation === "portrait" ? page.width : orientation === "landscape" || bestLandscape ? page.height : page.width;
  const pageH = orientation === "portrait" ? page.height : orientation === "landscape" || bestLandscape ? page.width : page.height;
  const cols = Math.max(0, Math.floor((pageW - 2 * margin + border) / (selectedSize.width + border)));
  const rows = Math.max(0, Math.floor((pageH - 2 * margin + border) / (selectedSize.height + border)));
  const maxCopies = Math.max(0, cols * rows);
  const actualCopies = fillSheet ? maxCopies : Math.min(Math.max(1, copies), maxCopies);

  const drawPhoto = useCallback(async () => {
    if (!image) return null;
    const img = await loadImage(image);
    const canvas = document.createElement("canvas");
    canvas.width = mmPx(selectedSize.width, dpi); canvas.height = mmPx(selectedSize.height, dpi);
    if (canvas.width * canvas.height > 40000000) throw new Error("This export is too large. Choose 300 DPI or a smaller photo size.");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare the photo.");
    if (bg !== "transparent") {
      ctx.fillStyle = bg === "original" ? "#ffffff" : bg === "custom" ? customHex : bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.filter = `brightness(${Math.max(0, brightness + shadows / 3)}%) contrast(${contrast}%) saturate(${saturation}%)`;
    coverDraw(ctx, img, 0, 0, canvas.width, canvas.height, zoom);
    ctx.filter = "none";
    if (warmth !== 0) {
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = warmth > 0 ? `rgba(255,150,55,${Math.min(0.22, warmth / 500)})` : `rgba(60,130,255,${Math.min(0.22, Math.abs(warmth) / 500)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    return canvas;
  }, [image, selectedSize.width, selectedSize.height, dpi, bg, customHex, brightness, contrast, shadows, saturation, warmth, zoom]);

  const drawSheet = useCallback(async () => {
    const photo = await drawPhoto();
    if (!photo) return null;
    const w = mmPx(pageW, dpi), h = mmPx(pageH, dpi);
    if (w * h > 40000000) throw new Error("The sheet is too large for this browser. Choose 300 DPI.");
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Could not prepare the print sheet.");
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    const pw = mmPx(selectedSize.width, dpi), ph = mmPx(selectedSize.height, dpi);
    const gap = mmPx(border, dpi), mx = mmPx(margin, dpi), my = mx;
    const count = Math.min(actualCopies, maxCopies);
    const usedCols = Math.max(1, Math.min(cols, count));
    const usedRows = Math.ceil(count / usedCols);
    const totalW = usedCols * pw + Math.max(0, usedCols - 1) * gap;
    const totalH = usedRows * ph + Math.max(0, usedRows - 1) * gap;
    const startX = placement === "center" ? Math.max(mx, Math.round((w - totalW) / 2)) : mx;
    const startY = placement === "center" ? Math.max(my, Math.round((h - totalH) / 2)) : my;
    for (let i = 0; i < count; i++) {
      const x = startX + (i % usedCols) * (pw + gap);
      const y = startY + Math.floor(i / usedCols) * (ph + gap);
      ctx.drawImage(photo, x, y, pw, ph);
      if (outline) { ctx.strokeStyle = "#222222"; ctx.lineWidth = Math.max(1, mmPx(0.15, dpi)); ctx.strokeRect(x, y, pw, ph); }
      if (guides === "dashed") { ctx.save(); ctx.strokeStyle = "#555555"; ctx.lineWidth = Math.max(1, mmPx(0.12, dpi)); ctx.setLineDash([mmPx(1, dpi), mmPx(1, dpi)]); ctx.strokeRect(x, y, pw, ph); ctx.restore(); }
      if (guides === "corners") {
        const len = mmPx(2, dpi), lw = Math.max(1, mmPx(0.15, dpi)); ctx.strokeStyle = "#111111"; ctx.lineWidth = lw;
        for (const [cx, cy, sx, sy] of [[x,y,1,1],[x+pw,y,-1,1],[x,y+ph,1,-1],[x+pw,y+ph,-1,-1]] as number[][]) {
          ctx.beginPath(); ctx.moveTo(cx, cy + sy * len); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * len, cy); ctx.stroke();
        }
      }
    }
    return canvas;
  }, [drawPhoto, pageW, pageH, dpi, selectedSize.width, selectedSize.height, border, margin, actualCopies, maxCopies, cols, placement, outline, guides]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!image || !previewRef.current) return;
      try {
        const sheet = await drawSheet();
        if (cancelled || !sheet || !previewRef.current) return;
        const target = previewRef.current, ctx = target.getContext("2d");
        if (!ctx) return;
        target.width = sheet.width; target.height = sheet.height;
        ctx.clearRect(0, 0, target.width, target.height); ctx.drawImage(sheet, 0, 0);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Preview could not be generated."); }
    };
    render();
    return () => { cancelled = true; };
  }, [image, drawSheet]);

  const runExport = async (kind: "photo-png" | "photo-jpg" | "sheet" | "pdf" | "print") => {
    if (!image) return;
    setBusy(true); setError("");
    try {
      const canvas = kind === "photo-png" || kind === "photo-jpg" ? await drawPhoto() : await drawSheet();
      if (!canvas) throw new Error("Upload a photo before exporting.");
      if (kind === "photo-png" || kind === "photo-jpg" || kind === "sheet") {
        const mime = kind === "photo-jpg" ? "image/jpeg" : "image/png";
        const rawBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed.")), mime, 0.96));
        const blob = kind === "sheet" ? rawBlob : await embedDpiMetadata(rawBlob, dpi, mime);
        downloadBlob(blob, kind === "photo-png" ? `passport-photo-${dpi}dpi.png` : kind === "photo-jpg" ? `passport-photo-${dpi}dpi.jpg` : `passport-photo-sheet-${dpi}dpi.png`);
      } else {
        const pdf = new jsPDF({ orientation: pageW > pageH ? "landscape" : "portrait", unit: "mm", format: [pageW, pageH], compress: true });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
        if (kind === "pdf") pdf.save(`passport-photo-sheet-${paper}.pdf`);
        else {
          const blob = pdf.output("blob"), url = URL.createObjectURL(blob), win = window.open(url, "_blank");
          if (!win) throw new Error("Allow pop-ups to print the sheet.");
          window.setTimeout(() => { try { win.focus(); win.print(); } catch {} }, 900);
          window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Export failed. Please try again."); }
    finally { setBusy(false); }
  };

  const resetAdjustments = () => {
    setBrightness(100); setContrast(100); setShadows(0); setSaturation(100); setWarmth(0); setZoom(1); setBg("original"); setCustomHex("#ffffff"); setAutoAdjusted(false);
  };
  const autoAdjust = () => { setBrightness(105); setContrast(108); setShadows(8); setSaturation(103); setWarmth(2); setAutoAdjusted(true); };

  return (
    <section className="mt-5 space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-slate-800">Photo Studio – Advanced Tools</h2><p className="mt-1 text-xs text-slate-500">Additional photo sizing, adjustments and print-sheet exports</p></div>
        <button type="button" onClick={onCropAgain} disabled={!image} className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-40">Adjust Crop Again</button>
      </div>
      {!image ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Upload and crop a photo above to use the advanced tools.</p> : <>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,.9fr)]">
          <div className="min-w-0 space-y-3">
            <div className="rounded-2xl border bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-600"><span>Live Print Sheet Preview</span><span>{pageW} × {pageH} mm</span></div><div className="flex max-h-[620px] items-center justify-center overflow-auto rounded-xl bg-slate-200 p-2"><canvas ref={previewRef} className="h-auto max-h-[580px] max-w-full border border-slate-300 bg-white shadow-md" /></div><p className="mt-2 text-xs text-slate-500">Estimated fit: {maxCopies} photos · Current sheet: {actualCopies} copies · {dpi} DPI</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button disabled={busy} onClick={() => runExport("photo-png")} className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><FileImage className="mx-auto mb-1" size={17}/>Download PNG</button>
              <button disabled={busy} onClick={() => runExport("photo-jpg")} className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><FileImage className="mx-auto mb-1" size={17}/>Download JPG</button>
              <button disabled={busy} onClick={() => runExport("sheet")} className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><Download className="mx-auto mb-1" size={17}/>Sheet Image</button>
              <button disabled={busy} onClick={() => runExport("pdf")} className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><FileText className="mx-auto mb-1" size={17}/>Export PDF</button>
              <button disabled={busy} onClick={() => runExport("print")} className="rounded-xl bg-rose-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-50"><Printer className="mx-auto mb-1" size={17}/>Print Sheet</button>
              <button onClick={resetAdjustments} className="rounded-xl border px-3 py-3 text-xs font-bold text-slate-700"><RotateCcw className="mx-auto mb-1" size={17}/>Reset Adjustments</button>
            </div>
          </div>
          <div className="min-w-0 space-y-4">
            <div className="rounded-2xl border p-4">
              <h3 className="mb-3 text-sm font-black text-slate-800">Photo Size & Resolution</h3>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Preset size</label>
              <select value={customSize ? "custom" : String(sizeIndex)} onChange={e => e.target.value === "custom" ? setCustomSize(true) : (setCustomSize(false), setSizeIndex(Number(e.target.value)))} className="h-10 w-full rounded-lg border bg-white px-3 text-sm">
                {SIZES.map((s,i)=><option key={s.label} value={i}>{s.label}</option>)}<option value="custom">Custom size (mm)</option>
              </select>
              {customSize && <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-xs text-slate-600">Width (mm)<input type="number" min="10" max="100" value={customW} onChange={e=>setCustomW(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-2"/></label><label className="text-xs text-slate-600">Height (mm)<input type="number" min="10" max="100" value={customH} onChange={e=>setCustomH(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-2"/></label></div>}
              <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs text-slate-600">Export DPI<select value={dpi} onChange={e=>setDpi(Number(e.target.value))} className="mt-1 h-9 w-full rounded-lg border px-2"><option value={300}>300 DPI</option><option value={600}>600 DPI</option></select></label><div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><b>Output pixels</b><p className="mt-1 font-mono">{mmPx(selectedSize.width,dpi)} × {mmPx(selectedSize.height,dpi)} px</p></div></div>
            </div>
            <div className="rounded-2xl border p-4">
              <h3 className="mb-3 text-sm font-black text-slate-800">Background & Colour</h3>
              <div className="grid grid-cols-4 gap-2">{BACKGROUNDS.map(([label,value])=><button key={value} onClick={()=>setBg(value)} className={`rounded-lg border p-2 text-[10px] font-semibold ${bg===value?"border-rose-500 ring-2 ring-rose-100":"border-slate-200"}`}><span className="mx-auto mb-1 block h-6 w-6 rounded-full border" style={{background:value==="transparent"?"repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 50% / 8px 8px":value==="original"?"linear-gradient(135deg,#d1d5db,#fff)":value}}/>{label}</button>)}</div>
              <div className="mt-3 flex items-center gap-2 text-xs"><input type="color" value={customHex} onChange={e=>{setCustomHex(e.target.value);setBg("custom")}}/><span>Custom HEX colour</span><code>{customHex}</code></div>
              <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-4 text-amber-800">These choices set the canvas behind the photo only. The original background pixels in the uploaded photograph remain unchanged; transparent mode does not cut out the subject. AI background removal is not used.</p>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">Colour & Light</h3><button onClick={autoAdjust} className="text-xs font-bold text-rose-600">Auto Adjust (Basic)</button></div>
              {([["Brightness",brightness,setBrightness,0,200],["Contrast",contrast,setContrast,0,200],["Shadows",shadows,setShadows,-50,50],["Saturation",saturation,setSaturation,0,200],["Warmth",warmth,setWarmth,-100,100],["Zoom",zoom,setZoom,0.5,2]] as const).map(([label,value,setter,min,max])=><label key={label} className="mb-3 block text-xs text-slate-600">{label}<input type="range" min={min} max={max} step={label==="Zoom"?0.05:1} value={value} onChange={e=>setter(Number(e.target.value))} className="mt-1 w-full accent-rose-600"/><span className="float-right text-[10px]">{value}</span></label>)}
              <button onClick={resetAdjustments} className="mt-1 rounded-lg border px-3 py-2 text-xs font-bold">Reset to Original</button>{autoAdjusted&&<span className="ml-2 text-[10px] text-emerald-700">Basic adjustment applied</span>}
            </div>
            <div className="rounded-2xl border p-4">
              <h3 className="mb-2 text-sm font-black text-slate-800">Dress Recolour – Not Available</h3>
              <p className="text-xs leading-5 text-slate-500">Accurate clothing-only selection cannot be guaranteed with the current non-AI tools. To protect the face, skin, hair and background, this control is intentionally not provided rather than recolouring the whole photograph incorrectly.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><label className="text-xs font-bold text-slate-600">Paper<select value={paper} onChange={e=>{setPaper(e.target.value as Paper);setCopies(1)}} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="A4">A4 (210 × 297 mm)</option><option value="6x4">6 × 4 inch (152.4 × 101.6 mm)</option></select></label></div>
          <div><label className="text-xs font-bold text-slate-600">Orientation<select value={orientation} onChange={e=>setOrientation(e.target.value as Orientation)} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="best">Best Fit</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label></div>
          <div><label className="text-xs font-bold text-slate-600">Placement<select value={placement} onChange={e=>setPlacement(e.target.value as "top-left"|"center")} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="top-left">Top-left</option><option value="center">Centred</option></select></label></div>
          <div><label className="text-xs font-bold text-slate-600">Cutting Guidelines<select value={guides} onChange={e=>setGuides(e.target.value as Guides)} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="dashed">Dashed outline</option><option value="corners">Corner crop marks</option><option value="none">None</option></select></label></div>
          <label className="text-xs font-bold text-slate-600">Number of Copies<div className="mt-1 flex h-10 items-center gap-2"><button onClick={()=>setCopies(v=>Math.max(1,v-1))} className="h-9 w-9 rounded-lg border">−</button><input type="number" min="1" max={maxCopies} value={fillSheet?maxCopies:copies} onChange={e=>{setFillSheet(false);setCopies(Math.max(1,Math.min(maxCopies,Number(e.target.value)||1)))}} className="h-9 min-w-0 w-full rounded-lg border text-center"/><button onClick={()=>setCopies(v=>Math.min(maxCopies,v+1))} className="h-9 w-9 rounded-lg border">+</button></div></label>
          <label className="text-xs font-bold text-slate-600">Sheet Margin (mm)<input type="number" min="0" max="30" value={margin} onChange={e=>setMargin(Math.max(0,Math.min(30,Number(e.target.value)||0)))} className="mt-1 h-10 w-full rounded-lg border px-2"/></label>
          <label className="text-xs font-bold text-slate-600">Spacing / Border (mm)<input type="number" min="0" max="10" step="0.5" value={border} onChange={e=>setBorder(Math.max(0,Math.min(10,Number(e.target.value)||0)))} className="mt-1 h-10 w-full rounded-lg border px-2"/></label>
          <div className="flex flex-col justify-end gap-2"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={fillSheet} onChange={e=>setFillSheet(e.target.checked)}/> Fill One Whole Sheet</label><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={outline} onChange={e=>setOutline(e.target.checked)}/> Thin photo outline</label></div>
          <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">Maximum fit: {maxCopies} photos ({cols} columns × {rows} rows). Photos are placed without stretching; sheet layout is calculated from the selected physical dimensions, margin and spacing.</p>
        </div>
        {busy&&<p className="rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-600">Preparing high-resolution export…</p>}
        {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </>}
    </section>
  );
}
