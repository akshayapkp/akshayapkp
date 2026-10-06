"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Printer, RotateCcw, X } from "lucide-react";

const PDF_URL = "/aadhaar-template.pdf";

const TEXT_FIELDS = new Set([
  "Aadhaar Number", "Full Name", "Full Name 2", "House No Bldg Apt",
  "Street Road Lane", "Landmark", "Area Locality Sector", "Village Town City",
  "Post Office", "District", "State2", "State", "Pincode", "Date", "Month", "Year",
]);

const CHECK_FIELDS = new Set(["Check Box", "Check Box52", "Check Box53", "Check Box54", "Check Box55"]);

const CHECK_LABELS: Record<string, string> = {
  "Check Box": "Resident",
  "Check Box52": "NRI",
  "Check Box53": "OCI / LTV / Nepal / Bhutan / Foreign National",
  "Check Box54": "New Enrolment",
  "Check Box55": "Update Request",
};

type FieldState = Record<string, string | boolean>;

type PdfField = {
  name: string;
  type: "text" | "check";
  rect: [number, number, number, number];
};

export default function AadhaarGazetteTool({ onClose }: { onClose?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [fields, setFields] = useState<PdfField[]>([]);
  const [values, setValues] = useState<FieldState>({
    "Check Box": true,
    "Check Box55": true,
  });
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      // @ts-expect-error pdfjs-dist may not ship declarations for this deep import in the current package version.
      const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
      const bytes = await fetch(PDF_URL).then((r) => r.arrayBuffer());
      const pdf = await pdfjs.getDocument({ data: bytes, disableWorker: true }).promise;
      const page = await pdf.getPage(1);

      const baseViewport = page.getViewport({ scale: 1 });
      const stageWidth = stageRef.current?.clientWidth ?? 900;
      const nextScale = Math.min(stageWidth / baseViewport.width, 1.55);
      const viewport = page.getViewport({ scale: nextScale });

      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(viewport.width * dpr);
      canvas.height = Math.round(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      await page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;

      const annotations = await page.getAnnotations({ intent: "display" });
      const nextFields: PdfField[] = [];

      for (const a of annotations) {
        const name = a.fieldName || a.id;
        if (!name || (!TEXT_FIELDS.has(name) && !CHECK_FIELDS.has(name))) continue;
        const [x1, y1, x2, y2] = a.rect;
        nextFields.push({
          name,
          type: CHECK_FIELDS.has(name) ? "check" : "text",
          rect: [x1 * nextScale, viewport.height - y2 * nextScale, (x2 - x1) * nextScale, (y2 - y1) * nextScale],
        });
      }

      if (!cancelled) {
        setScale(nextScale);
        setFields(nextFields);
      }

      cleanup = () => pdf.destroy();
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  const setValue = (name: string, value: string | boolean) => {
    setValues((old) => ({ ...old, [name]: value }));
  };

  const reset = () => {
    const fresh: FieldState = {};
    fields.forEach((f) => { if (f.type === "check") fresh[f.name] = f.name === "Check Box" || f.name === "Check Box55"; });
    setValues(fresh);
  };

  const makePdf = async () => {
    const { PDFDocument } = await import("pdf-lib");
    const response = await fetch(PDF_URL);
    const source = await response.arrayBuffer();
    const pdf = await PDFDocument.load(source);
    const form = pdf.getForm();

    for (const [name, value] of Object.entries(values)) {
      if (CHECK_FIELDS.has(name)) {
        const field = form.getCheckBox(name);
        if (value) field.check(); else field.uncheck();
      } else if (TEXT_FIELDS.has(name)) {
        form.getTextField(name).setText(String(value ?? ""));
      }
    }

    form.updateFieldAppearances();
    return await pdf.save();
  };

  const downloadPdf = async () => {
    const bytes = await makePdf();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Aadhaar-Gazette-Filled.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const printPdf = async () => {
    const bytes = await makePdf();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 1200);
  };

  const stageHeight = useMemo(() => 841.89 * scale, [scale]);

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm">
      <div className="flex h-[96vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white"><FileText size={17} /></div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Aadhaar Gazette</h2>
              <p className="text-[10px] text-slate-500">Exact original PDF layout • editable fields</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><RotateCcw size={14} /> Reset</button>
            <button type="button" onClick={downloadPdf} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Download size={14} /> Save PDF</button>
            <button type="button" onClick={printPdf} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"><Printer size={14} /> Print</button>
            {onClose && <button type="button" onClick={onClose} className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"><X size={17} /></button>}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-200/70 p-3">
          <div ref={stageRef} className="mx-auto w-fit bg-white shadow-lg" style={{ minHeight: stageHeight }}>
            <div className="relative" style={{ width: `${595.276 * scale}px`, height: `${841.89 * scale}px` }}>
              <canvas ref={canvasRef} className="absolute inset-0 block" />
              {fields.map((field) => {
                const [left, top, width, height] = field.rect;
                if (field.type === "check") {
                  return (
                    <input
                      key={field.name}
                      type="checkbox"
                      aria-label={CHECK_LABELS[field.name] || field.name}
                      checked={Boolean(values[field.name])}
                      onChange={(e) => setValue(field.name, e.target.checked)}
                      className="absolute m-0 cursor-pointer accent-slate-700"
                      style={{ left, top, width, height }}
                    />
                  );
                }
                return (
                  <input
                    key={field.name}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    aria-label={field.name}
                    className="absolute m-0 border-0 bg-transparent p-0 text-[10px] font-sans text-black outline-none"
                    style={{ left, top, width, height, lineHeight: `${height}px`, paddingLeft: field.name === "Date" || field.name === "Month" || field.name === "Year" ? 2 : 3 }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
