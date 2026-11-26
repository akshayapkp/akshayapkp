"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Download, FileImage, FileText, Printer, RotateCcw } from "lucide-react";

type Props = { image: string | null; onCropAgain: () => void; onChoosePhoto?: () => void };
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
function mmPx(mm: number, dpi: number) { return Math.max(1, Math.round((mm / 25.4) * dpi)); }
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The selected photo could not be opened."));
    img.src = src;
  });
}
function fitDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, zoom: number, offsetX: number, offsetY: number) {
  // Fill the complete passport-photo frame. "contain" sizing can leave thin
  // white strips at the top/bottom when source and target ratios differ by
  // even a fraction of a pixel after DPI rounding.
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(
    img,
    x + (w - dw) / 2 + (offsetX / 100) * w,
    y + (h - dh) / 2 + (offsetY / 100) * h,
    dw,
    dh
  );
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
      if (bytes[i] === 0xff && bytes[i + 1] === 0xe0 && String.fromCharCode(...bytes.slice(i + 4, i + 9)) === "JFIF\0") { app0 = i; break; }
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

export default function PassportPhotoEnhancements({ image, onCropAgain, onChoosePhoto = onCropAgain }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [sizeIndex, setSizeIndex] = useState(0);
  const [customW, setCustomW] = useState("35");
  const [customH, setCustomH] = useState("45");
  const [customSize, setCustomSize] = useState(false);
  const [dpi, setDpi] = useState(300);
  const [paper, setPaper] = useState<Paper>("A4");
  const [orientation, setOrientation] = useState<Orientation>("best");
  const [copies, setCopies] = useState(1);
  const [fillSheet, setFillSheet] = useState(false);
  const [placement, setPlacement] = useState<"top-left" | "center">("top-left");
  const [margin, setMargin] = useState(3);
  const [border, setBorder] = useState(2);
  const [guides, setGuides] = useState<Guides>("dashed");
  const [outline, setOutline] = useState(true);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [shadows, setShadows] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoAdjusted, setAutoAdjusted] = useState(false);
  const [activeTab, setActiveTab] = useState<"photo" | "sheet">("photo");

  const [printSettingsLoaded, setPrintSettingsLoaded] = useState(false);

  const resetPrintSettings = useCallback(() => {
    setPaper("A4");
    setOrientation("best");
    setCopies(1);
    setFillSheet(false);
    setPlacement("top-left");
    setMargin(3);
    setBorder(2);
    setGuides("dashed");
    setOutline(true);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pkp-passport-print-settings-v1");
      if (saved) {
        const value = JSON.parse(saved) as Record<string, unknown>;
        if (value.paper === "A4" || value.paper === "6x4") setPaper(value.paper);
        if (value.orientation === "best" || value.orientation === "portrait" || value.orientation === "landscape") setOrientation(value.orientation);
        if (typeof value.copies === "number" && Number.isFinite(value.copies)) setCopies(Math.max(1, Math.min(100, Math.floor(value.copies))));
        if (typeof value.fillSheet === "boolean") setFillSheet(value.fillSheet);
        if (value.placement === "top-left" || value.placement === "center") setPlacement(value.placement);
        if (typeof value.margin === "number" && Number.isFinite(value.margin)) setMargin(Math.max(0, Math.min(30, value.margin)));
        if (typeof value.border === "number" && Number.isFinite(value.border)) setBorder(Math.max(0, Math.min(10, value.border)));
        if (value.guides === "dashed" || value.guides === "corners" || value.guides === "none") setGuides(value.guides);
        if (typeof value.outline === "boolean") setOutline(value.outline);
      }
    } catch {
      // Ignore invalid or unavailable browser storage and keep safe defaults.
    }
    setPrintSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!printSettingsLoaded) return;
    try {
      localStorage.setItem("pkp-passport-print-settings-v1", JSON.stringify({
        paper, orientation, copies, fillSheet, placement, margin, border, guides, outline,
      }));
    } catch {
      // Printing remains usable even if browser storage is unavailable.
    }
  }, [printSettingsLoaded, paper, orientation, copies, fillSheet, placement, margin, border, guides, outline]);

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
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${Math.max(0, brightness + shadows / 3)}%) contrast(${contrast}%) saturate(${saturation}%)`;
    fitDraw(ctx, img, 0, 0, canvas.width, canvas.height, zoom, offsetX, offsetY);
    ctx.filter = "none";
    if (warmth !== 0) {
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = warmth > 0 ? `rgba(255,150,55,${Math.min(0.22, warmth / 500)})` : `rgba(60,130,255,${Math.min(0.22, Math.abs(warmth) / 500)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    return canvas;
  }, [image, selectedSize.width, selectedSize.height, dpi, brightness, contrast, shadows, saturation, warmth, zoom, offsetX, offsetY]);

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
    // Fill each column from top to bottom before moving to the next column.
    // This matches the requested print order: 1 above 2, then 3 above 4.
    const usedRows = Math.max(1, Math.min(rows, count));
    const usedCols = Math.max(1, Math.min(cols, Math.ceil(count / usedRows)));
    const totalW = usedCols * pw + Math.max(0, usedCols - 1) * gap;
    const totalH = usedRows * ph + Math.max(0, usedRows - 1) * gap;
    const startX = placement === "center" ? Math.max(mx, Math.round((w - totalW) / 2)) : mx;
    const startY = placement === "center" ? Math.max(my, Math.round((h - totalH) / 2)) : my;
    for (let i = 0; i < count; i++) {
      const column = Math.floor(i / usedRows);
      const row = i % usedRows;
      const x = startX + column * (pw + gap);
      const y = startY + row * (ph + gap);
      ctx.drawImage(photo, x, y, pw, ph);

      if (outline) {
        ctx.save();
        ctx.strokeStyle = "#222222";
        ctx.lineWidth = Math.max(1, mmPx(0.15, dpi));
        ctx.strokeRect(x, y, pw, ph);
        ctx.restore();
      }

      // Cutting guides are placed in the whitespace between photos, not over the photo.
      if (guides !== "none") {
        const halfGap = Math.max(1, Math.round(gap / 2));
        const left = Math.max(0, x - halfGap);
        const top = Math.max(0, y - halfGap);
        const right = Math.min(w, x + pw + halfGap);
        const bottom = Math.min(h, y + ph + halfGap);
        const lw = Math.max(1, mmPx(0.15, dpi));
        ctx.save();
        ctx.strokeStyle = "#343434";
        ctx.lineWidth = lw;
        if (guides === "dashed") {
          ctx.setLineDash([mmPx(1.2, dpi), mmPx(0.8, dpi)]);
          ctx.strokeRect(left, top, right - left, bottom - top);
        } else {
          const len = Math.max(mmPx(2, dpi), mmPx(2.5, dpi));
          const marks: number[][] = [
            [left, top, 1, 1], [right, top, -1, 1],
            [left, bottom, 1, -1], [right, bottom, -1, -1],
          ];
          for (const [cx, cy, sx, sy] of marks) {
            ctx.beginPath();
            ctx.moveTo(cx, cy + sy * len);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx + sx * len, cy);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    return canvas;
  }, [drawPhoto, pageW, pageH, dpi, selectedSize.width, selectedSize.height, border, margin, actualCopies, maxCopies, cols, placement, outline, guides]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!image || !previewRef.current) return;
      try {
        const sheet = activeTab === "photo" ? await drawPhoto() : await drawSheet();
        if (cancelled || !sheet || !previewRef.current) return;
        const target = previewRef.current, ctx = target.getContext("2d");
        if (!ctx) return;
        target.width = sheet.width; target.height = sheet.height;
        ctx.clearRect(0, 0, target.width, target.height); ctx.drawImage(sheet, 0, 0);
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Preview could not be generated."); }
    };
    render();
    return () => { cancelled = true; };
  }, [image, activeTab, drawPhoto, drawSheet]);

  const runExport = async (kind: "photo-png" | "photo-jpg" | "sheet" | "pdf" | "print") => {
    if (!image) return;
    let printWindow: Window | null = null;
    if (kind === "print") {
      printWindow = window.open("about:blank", "_blank");
      if (!printWindow) { setError("Allow pop-ups to print the sheet."); return; }
    }
    setBusy(true); setError("");
    try {
      const canvas = kind === "photo-png" || kind === "photo-jpg" ? await drawPhoto() : await drawSheet();
      if (!canvas) throw new Error("Upload a photo before exporting.");
      if (kind === "photo-png" || kind === "photo-jpg" || kind === "sheet") {
        const mime = kind === "photo-jpg" ? "image/jpeg" : "image/png";
        const rawBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image export failed.")), mime, 0.96));
        const blob = await embedDpiMetadata(rawBlob, dpi, mime);
        downloadBlob(blob, kind === "photo-png" ? `passport-photo-${dpi}dpi.png` : kind === "photo-jpg" ? `passport-photo-${dpi}dpi.jpg` : `passport-photo-sheet-${dpi}dpi.png`);
      } else {
        const pdf = new jsPDF({ orientation: pageW > pageH ? "landscape" : "portrait", unit: "mm", format: [pageW, pageH], compress: true });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
        if (kind === "pdf") pdf.save(`passport-photo-sheet-${paper}.pdf`);
        else {
          const blob = pdf.output("blob"), url = URL.createObjectURL(blob);
          const target = printWindow;
          if (!target) throw new Error("Print window could not be opened.");
          target.location.href = url;
          target.onload = () => { try { target.focus(); target.print(); } catch {} };
          window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }
    } catch (e) {
      if (printWindow && !printWindow.closed) printWindow.close();
      setError(e instanceof Error ? e.message : "Export failed. Please try again.");
    }
    finally { setBusy(false); }
  };

  const resetAdjustments = () => {
    setBrightness(100); setContrast(100); setShadows(0); setSaturation(100); setWarmth(0); setZoom(1); setOffsetX(0); setOffsetY(0); setAutoAdjusted(false);
  };
  const autoAdjust = () => { setBrightness(105); setContrast(108); setShadows(8); setSaturation(103); setWarmth(2); setAutoAdjusted(true); };

  return (
    <section className="rounded-3xl border border-indigo-100/80 bg-white/85/75 p-4 shadow-[0_22px_54px_rgba(79,70,229,0.12)] backdrop-blur-xl sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Photo Studio – Photo Setter</h2>
          <p className="mt-1 text-xs text-slate-500">Create passport photos and print-ready photo sheets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onChoosePhoto} className="rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700">Upload / Change Photo</button>
          <button type="button" onClick={onCropAgain} disabled={!image} className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">Crop Again</button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-1 rounded-xl bg-indigo-100/60 p-1">
            <button type="button" onClick={() => setActiveTab("photo")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${activeTab === "photo" ? "bg-white/85 text-slate-900 shadow-sm" : "text-slate-500"}`}>Photo</button>
            <button type="button" onClick={() => setActiveTab("sheet")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${activeTab === "sheet" ? "bg-white/85 text-slate-900 shadow-sm" : "text-slate-500"}`}>Print Sheet</button>
          </div>
          <div className="flex min-h-[520px] flex-col rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900">{activeTab === "photo" ? "Photo Preview" : "Print Sheet Preview"}</h3>
                <p className="mt-1 text-xs text-slate-500">{activeTab === "photo" ? `${selectedSize.width} × ${selectedSize.height} mm · ${dpi} DPI` : `${paper} · ${pageW.toFixed(1)} × ${pageH.toFixed(1)} mm · ${actualCopies} copies`}</p>
              </div>
              {image && <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-slate-600">{activeTab === "photo" ? "Single photo" : `Fits up to ${maxCopies} photos`}</span>}
            </div>
            {image ? (
              <div className="flex flex-1 items-center justify-center overflow-auto rounded-xl bg-indigo-100/70 p-3">
                <canvas ref={previewRef} className="h-auto max-h-[650px] max-w-full border border-indigo-200 bg-white/85 shadow-[0_18px_45px_rgba(79,70,229,0.16)]" />
              </div>
            ) : (
              <button type="button" onClick={onChoosePhoto} className="flex min-h-[430px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white/85 px-6 text-center hover:border-indigo-400">
                <FileImage size={48} className="mb-4 text-indigo-400" />
                <span className="text-base font-bold text-slate-900">Upload your photo</span>
                <span className="mt-2 max-w-sm text-sm text-slate-500">Choose a photo to open the crop tool and start creating your passport photo.</span>
                <span className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-5 py-2.5 text-sm font-bold text-white">Choose Photo</span>
              </button>
            )}
            {image && <p className="mt-3 text-xs text-slate-500">{activeTab === "photo" ? "The preview updates when you change photo size, crop and light settings." : "The sheet preview updates automatically when you change paper, copies, margin or border."}</p>}
          </div>
          {busy && <p className="mt-3 rounded-lg bg-indigo-100/60 p-3 text-xs font-semibold text-slate-600">Preparing high-resolution output…</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        </div>

        <aside className="min-w-0 space-y-3">
          <details open className="group rounded-2xl border border-indigo-100 bg-white/85">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900">Photo Size <span className="text-indigo-400 transition group-open:rotate-180">⌄</span></summary>
            <div className="space-y-3 border-t border-indigo-50 p-4">
              <label className="block text-xs font-semibold text-slate-600">Photo size preset
                <select value={customSize ? "custom" : String(sizeIndex)} onChange={e => e.target.value === "custom" ? setCustomSize(true) : (setCustomSize(false), setSizeIndex(Number(e.target.value)))} className="mt-1.5 h-10 w-full rounded-lg border bg-white/85 px-3 text-sm">
                  {SIZES.map((s,i)=><option key={s.label} value={i}>{s.label}</option>)}<option value="custom">Custom size (mm)</option>
                </select>
              </label>
              {customSize && <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">Width (mm)<input type="number" min="10" max="100" value={customW} onChange={e=>setCustomW(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-2"/></label>
                <label className="text-xs text-slate-600">Height (mm)<input type="number" min="10" max="100" value={customH} onChange={e=>setCustomH(e.target.value)} className="mt-1 h-9 w-full rounded-lg border px-2"/></label>
              </div>}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">Resolution
                  <select value={dpi} onChange={e=>setDpi(Number(e.target.value))} className="mt-1 h-9 w-full rounded-lg border px-2"><option value={300}>300 DPI</option><option value={600}>600 DPI</option></select>
                </label>
                <div className="rounded-lg bg-indigo-50/70 p-2 text-xs text-slate-600"><b>Pixels</b><p className="mt-1 font-mono">{mmPx(selectedSize.width,dpi)} × {mmPx(selectedSize.height,dpi)}</p></div>
              </div>
            </div>
          </details>

          <details className="group rounded-2xl border border-indigo-100 bg-white/85">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900">Crop <span className="text-indigo-400 transition group-open:rotate-180">⌄</span></summary>
            <div className="space-y-3 border-t border-indigo-50 p-4">
              <p className="text-xs leading-5 text-slate-500">Open the crop editor to adjust the face position and framing. The current crop is retained for photo and print exports.</p>
              <button type="button" onClick={onCropAgain} disabled={!image} className="w-full rounded-lg border border-indigo-200 px-3 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-40">Adjust Crop Again</button>
              <label className="block text-xs text-slate-600">Zoom <input type="range" min="0.5" max="2" step="0.05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="mt-2 w-full accent-indigo-600"/><span className="float-right">{zoom.toFixed(2)}×</span></label>
              <label className="block text-xs text-slate-600">Horizontal position <input type="range" min="-50" max="50" value={offsetX} onChange={e=>setOffsetX(Number(e.target.value))} className="mt-2 w-full accent-indigo-600"/></label>
              <label className="block text-xs text-slate-600">Vertical position <input type="range" min="-50" max="50" value={offsetY} onChange={e=>setOffsetY(Number(e.target.value))} className="mt-2 w-full accent-indigo-600"/></label>
            </div>
          </details>

          <details className="group rounded-2xl border border-indigo-100 bg-white/85">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900">Colour & Light <span className="text-indigo-400 transition group-open:rotate-180">⌄</span></summary>
            <div className="space-y-3 border-t border-indigo-50 p-4">
              <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Basic auto adjust</span><button type="button" onClick={autoAdjust} className="text-xs font-bold text-indigo-700">Auto Adjust</button></div>
              {([[ "Brightness",brightness,setBrightness,0,200 ],[ "Contrast",contrast,setContrast,0,200 ],[ "Shadows",shadows,setShadows,-50,50 ],[ "Saturation",saturation,setSaturation,0,200 ],[ "Warmth",warmth,setWarmth,-100,100 ]] as const).map(([label,value,setter,min,max])=><label key={label} className="block text-xs text-slate-600">{label}<input type="range" min={min} max={max} value={value} onChange={e=>setter(Number(e.target.value))} className="mt-1.5 w-full accent-indigo-600"/><span className="float-right text-[10px]">{value}</span></label>)}
              <button type="button" onClick={resetAdjustments} className="w-full rounded-lg border px-3 py-2 text-xs font-bold text-slate-700">Reset Colour & Light</button>
            </div>
          </details>

          <details className="group rounded-2xl border border-indigo-100 bg-white/85">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900">Download <span className="text-indigo-400 transition group-open:rotate-180">⌄</span></summary>
            <div className="grid grid-cols-2 gap-2 border-t border-indigo-50 p-4">
              <button disabled={!image||busy} onClick={() => runExport("photo-png")} className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-3 py-3 text-xs font-bold text-white disabled:opacity-40"><FileImage className="mx-auto mb-1" size={17}/>PNG Photo</button>
              <button disabled={!image||busy} onClick={() => runExport("photo-jpg")} className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-3 py-3 text-xs font-bold text-white disabled:opacity-40"><FileImage className="mx-auto mb-1" size={17}/>JPG Photo</button>
              <button disabled={!image||busy} onClick={() => runExport("sheet")} className="col-span-2 rounded-lg border px-3 py-3 text-xs font-bold text-slate-700 disabled:opacity-40"><Download className="mr-2 inline" size={16}/>Download Print Sheet Image</button>
            </div>
          </details>

          <details open className="group rounded-2xl border border-indigo-100 bg-white/85">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-black text-slate-900">Print as multiple photos <span className="text-indigo-400 transition group-open:rotate-180">⌄</span></summary>
            <div className="space-y-3 border-t border-indigo-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500">Your last print settings are saved automatically for the next photo.</p>
                <button type="button" onClick={resetPrintSettings} className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Reset defaults</button>
              </div>
              <label className="block text-xs font-semibold text-slate-600">Paper size
                <select value={paper} onChange={e=>{setPaper(e.target.value as Paper);setCopies(1)}} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="A4">A4 (210 × 297 mm)</option><option value="6x4">6 × 4 inch (152.4 × 101.6 mm)</option></select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">Orientation<select value={orientation} onChange={e=>setOrientation(e.target.value as Orientation)} className="mt-1 h-9 w-full rounded-lg border px-2"><option value="best">Best Fit</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
                <label className="text-xs text-slate-600">Placement<select value={placement} onChange={e=>setPlacement(e.target.value as "top-left"|"center")} className="mt-1 h-9 w-full rounded-lg border px-2"><option value="top-left">Top-left</option><option value="center">Centred</option></select></label>
              </div>
              <label className="block text-xs text-slate-600">Copies
                <input type="number" min="1" max={maxCopies} value={fillSheet?maxCopies:copies} onChange={e=>{setFillSheet(false);setCopies(Math.max(1,Math.min(maxCopies,Number(e.target.value)||1)))}} className="mt-1 h-10 w-full rounded-lg border px-3"/>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">Border / spacing (mm)<input type="number" min="0" max="10" step="0.5" value={border} onChange={e=>setBorder(Math.max(0,Math.min(10,Number(e.target.value)||0)))} className="mt-1 h-10 w-full rounded-lg border px-3"/></label>
                <label className="block text-xs text-slate-600">Sheet margin (mm)<input type="number" min="0" max="30" value={margin} onChange={e=>setMargin(Math.max(0,Math.min(30,Number(e.target.value)||0)))} className="mt-1 h-10 w-full rounded-lg border px-3"/></label>
              </div>
              <label className="block text-xs text-slate-600">Cutting guidelines<select value={guides} onChange={e=>setGuides(e.target.value as Guides)} className="mt-1 h-10 w-full rounded-lg border px-2"><option value="dashed">Dashed outline</option><option value="corners">Corner crop marks</option><option value="none">None</option></select></label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={fillSheet} onChange={e=>setFillSheet(e.target.checked)}/> Fill the whole sheet ({maxCopies} photos)</label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={outline} onChange={e=>setOutline(e.target.checked)}/> Photo border outline</label>
              <p className="rounded-lg bg-indigo-50/70 p-2 text-xs text-slate-600">Preview capacity: {maxCopies} photos · {cols} columns × {rows} rows</p>
              <div className="grid grid-cols-2 gap-2">
                <button disabled={!image||busy} onClick={() => runExport("pdf")} className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-3 py-3 text-xs font-bold text-white disabled:opacity-40"><FileText className="mx-auto mb-1" size={17}/>Save PDF</button>
                <button disabled={!image||busy} onClick={() => runExport("print")} className="rounded-lg bg-gradient-to-r from-indigo-600 to-teal-500 px-3 py-3 text-xs font-bold text-white disabled:opacity-40"><Printer className="mx-auto mb-1" size={17}/>Print</button>
              </div>
            </div>
          </details>
        </aside>
      </div>
    </section>
  );
}
