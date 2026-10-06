"use client";

import React, { useRef, useState } from "react";
import { ExternalLink, FileText, Printer, RotateCcw, X } from "lucide-react";

const TEMPLATE = "/aadhaar-template.pdf";

export default function AadhaarGazetteTool({ onClose }: { onClose?: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reset = () => setReloadKey((v) => v + 1);

  const openExactPdf = () => {
    window.open(`${TEMPLATE}#toolbar=0&navpanes=0&view=FitH`, "_blank");
  };

  const printPdf = () => {
    const w = window.open(`${TEMPLATE}#toolbar=0&navpanes=0&view=FitH`, "_blank");
    if (!w) return;
    window.setTimeout(() => {
      try { w.focus(); w.print(); } catch {}
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm">
      <div className="flex h-[96vh] w-full max-w-[1100px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white"><FileText size={17} /></div>
            <div>
              <h2 className="text-sm font-black text-slate-800">Aadhaar Gazette</h2>
              <p className="text-[10px] text-slate-500">Original PDF template — exact layout</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><RotateCcw size={14} /> Reset</button>
            <button type="button" onClick={printPdf} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"><Printer size={14} /> Print</button>
            <button type="button" onClick={openExactPdf} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><ExternalLink size={14} /> Open PDF</button>
            {onClose && <button type="button" onClick={onClose} aria-label="Close" className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><X size={17} /></button>}
          </div>
        </div>
        <div className="flex-1 bg-slate-200/70 p-2">
          <iframe key={reloadKey} ref={frameRef} title="Aadhaar Standard Format" src={`${TEMPLATE}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`} className="h-full w-full rounded-lg border-0 bg-white shadow-inner" />
        </div>
      </div>
    </div>
  );
}
