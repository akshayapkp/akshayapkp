"use client";

import React, { useState } from "react";
import { Copy, History, Trash2, Save, ArrowLeft } from "lucide-react";
import Tesseract from "tesseract.js";
import { extractWorkData } from "@/app/dashboard/work-status/parser";
import { addWork } from "@/app/dashboard/work-status/storage";

interface ImageToTextProps {
  onClose: () => void;
}

export default function ImageToTextTool({ onClose }: ImageToTextProps) {
  const [, setOcrImage] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<Array<{id:string;extracted_text:string;created_at:string;status:string}>>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [historyText, setHistoryText] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyMessage, setHistoryMessage] = useState("");

  const loadHistory = async () => {
    setHistoryBusy(true);
    setHistoryMessage("");
    try {
      const response = await fetch("/api/receipt-ocr", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "History load failed.");
      setHistoryItems(result.data || []);
      if (selectedHistoryId) {
        const selected = (result.data || []).find((item: any) => item.id === selectedHistoryId);
        if (selected) setHistoryText(selected.extracted_text);
      }
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "History തുറക്കാൻ കഴിഞ്ഞില്ല.");
    } finally { setHistoryBusy(false); }
  };

  const saveHistoryText = async () => {
    if (!selectedHistoryId) return;
    setHistoryBusy(true);
    try {
      const response = await fetch("/api/receipt-ocr", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: selectedHistoryId, text: historyText }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Save failed.");
      setHistoryMessage("മാറ്റങ്ങൾ സൂക്ഷിച്ചു.");
      await loadHistory();
    } catch (error) { setHistoryMessage(error instanceof Error ? error.message : "സൂക്ഷിക്കാൻ കഴിഞ്ഞില്ല."); }
    finally { setHistoryBusy(false); }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!window.confirm("ഈ History item ഡിലീറ്റ് ചെയ്യണോ?")) return;
    setHistoryBusy(true);
    try {
      const response = await fetch("/api/receipt-ocr?id=" + encodeURIComponent(id), { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Delete failed.");
      if (selectedHistoryId === id) { setSelectedHistoryId(""); setHistoryText(""); }
      await loadHistory();
    } catch (error) { setHistoryMessage(error instanceof Error ? error.message : "ഡിലീറ്റ് ചെയ്യാൻ കഴിഞ്ഞില്ല."); }
    finally { setHistoryBusy(false); }
  };

  const clearHistory = async () => {
    if (!window.confirm("എല്ലാ Receipt OCR History-യും സ്ഥിരമായി Clear ചെയ്യണോ?")) return;
    setHistoryBusy(true);
    try {
      const response = await fetch("/api/receipt-ocr", { method: "DELETE" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Clear failed.");
      setHistoryItems([]); setSelectedHistoryId(""); setHistoryText(""); setHistoryMessage("History clear ചെയ്തു.");
    } catch (error) { setHistoryMessage(error instanceof Error ? error.message : "History clear ചെയ്യാൻ കഴിഞ്ഞില്ല."); }
    finally { setHistoryBusy(false); }
  };

  const handleFileToText = async (file: File) => {
    setOcrImage(file);
    setOcrLoading(true);
    setOcrText("");
    setOcrProgress(0);

    try {
      if (file.type === "application/pdf") {
        setOcrProgress(10);
        const pdfjsLib = await import("pdfjs-dist");

        // CORS & Codespaces എറർ പൂർണ്ണമായി ഒഴിവാക്കാൻ Worker Script Fetch ചെയ്ത് Blob URL ആക്കുന്നു
        try {
          const workerUrl = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const response = await fetch(workerUrl);
          const workerScript = await response.text();
          const blob = new Blob([workerScript], { type: "application/javascript" });
          pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch {
          // ഫെയിൽ ആയാൽ fallback ആയി direct unpkg URL നൽകുന്നു
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullExtractedText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          setOcrProgress(Math.round(20 + (i / pdf.numPages) * 30));
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            const renderTask = page.render({
  canvas,
  canvasContext: context,
  viewport,
});

await renderTask.promise;
            const imageUrl = canvas.toDataURL("image/png");
            
            const result = await Tesseract.recognize(imageUrl, "eng+mal", {
              logger: (m) => {
                if (m.status === "recognizing text") {
                  const pageProgress = Math.round((m.progress || 0) * (50 / pdf.numPages));
                  setOcrProgress(Math.min(90, 50 + pageProgress + ((i - 1) * (50 / pdf.numPages))));
                }
              },
            });
            fullExtractedText += `--- Page ${i} ---\n` + result.data.text + "\n\n";
          }
        }

        setOcrText(fullExtractedText);
        setOcrProgress(100);
      } else {
        // ഇമേജ് ഫയലുകൾക്കായി (JPG, PNG, WEBP)
        const imageUrl = URL.createObjectURL(file);
        
        const result = await Tesseract.recognize(imageUrl, "eng+mal", {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setOcrProgress(Math.round((m.progress || 0) * 100));
            }
          },
        });
        
        setOcrText(result.data.text);
        const work = extractWorkData(result.data.text);

if (work) {
  addWork(work);
}
        URL.revokeObjectURL(imageUrl);
      }
    } catch (error: any) {
      console.error(error);
      alert(error?.message || JSON.stringify(error) || "Failed to extract text.");
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-950/70 p-2 backdrop-blur-md sm:p-3">
      <div className="flex h-[calc(100vh-1rem)] max-h-[760px] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:h-[calc(100vh-1.5rem)] sm:rounded-[28px]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 py-3.5 backdrop-blur-xl sm:px-6 sm:py-4">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-800 sm:text-xl">Image & PDF To Text</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">Extract text from images or PDF files instantly</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setShowHistory(v => !v); if (!showHistory) void loadHistory(); }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><History size={15}/>{showHistory ? "OCR Tool" : "History"}</button>
            <button
              onClick={() => {
                onClose();
                setOcrImage(null);
                setOcrText("");
                setOcrProgress(0);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900"
            >✕</button>
          </div>
        </div>

        {showHistory && <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2"><h4 className="font-black text-slate-800">Receipt OCR History</h4><button type="button" disabled={historyBusy || !historyItems.length} onClick={clearHistory} className="rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-40"><Trash2 size={14} className="mr-1 inline"/>Clear History</button></div>
          {historyMessage && <p role="status" className="mb-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{historyMessage}</p>}
          {historyBusy && <p className="py-3 text-sm text-slate-500">Loading...</p>}
          {!historyBusy && historyItems.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">History-യിൽ receipts ഒന്നുമില്ല.</p>}
          <div className="grid gap-3 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]">
            <div className="space-y-2">{historyItems.map(item => <div key={item.id} className={`rounded-xl border p-3 ${selectedHistoryId===item.id ? "border-blue-400 bg-blue-50/50" : "border-slate-200"}`}>
              <button type="button" onClick={() => {setSelectedHistoryId(item.id);setHistoryText(item.extracted_text);setHistoryMessage("");}} className="w-full text-left"><strong className="block text-xs text-slate-700">{new Date(item.created_at).toLocaleString("en-IN")}</strong><span className="mt-1 block text-xs text-slate-500">{item.extracted_text.slice(0,110)}{item.extracted_text.length>110?"…":""}</span></button>
              <button type="button" onClick={() => void deleteHistoryItem(item.id)} className="mt-2 text-xs font-bold text-red-600"><Trash2 size={13} className="mr-1 inline"/>Delete</button>
            </div>)}</div>
            <div className="min-w-0">{selectedHistoryId ? <>
              <textarea value={historyText} onChange={e=>setHistoryText(e.target.value)} className="min-h-[260px] w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-blue-400"/>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={()=>{void navigator.clipboard.writeText(historyText);setHistoryMessage("Text copy ചെയ്തു.");}} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Copy size={15} className="mr-1 inline"/>Copy Text</button>
                <button type="button" disabled={historyBusy} onClick={()=>void saveHistoryText()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={15} className="mr-1 inline"/>Save Changes</button>
              </div>
            </> : <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">ഒരു History item തിരഞ്ഞെടുക്കുക.</p>}</div>
          </div>
        </div>}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5" style={{ display: showHistory ? "none" : undefined }}>
          <div className="space-y-4">
            <div>
              <label className="group flex min-h-16 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300/80 bg-orange-50/40 px-3 py-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50 hover:shadow-[0_14px_35px_rgba(249,115,22,0.12)] sm:min-h-20">
                <p className="text-base font-black text-slate-800">Browse Image or PDF</p>
                <p className="mt-1 text-xs font-medium text-slate-500">JPG • PNG • WEBP • PDF</p>
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileToText(file);
                    }
                  }}
                />
              </label>
            </div>

            {ocrLoading && (
              <div className="space-y-2 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>Processing File & Extracting Text...</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm">
              {ocrText.length} Characters &nbsp;&nbsp; | &nbsp;&nbsp;
              {ocrText.trim() === "" ? 0 : ocrText.trim().split(/\s+/).length} Words &nbsp;&nbsp; | &nbsp;&nbsp;
              {ocrText.split("\n").length} Lines
            </div>

            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              placeholder="Extracted text will appear here..."
              className="h-[180px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-inner outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10 sm:h-[210px] lg:h-[240px]"
            />

            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(ocrText);
                  alert("Text copied successfully.");
                }}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-black sm:px-5 sm:py-3.5 text-white shadow-[0_12px_30px_rgba(37,99,235,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Copy size={18} />
                Copy Text
              </button>

              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "Extracted-Text.txt";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 font-black sm:px-5 sm:py-3.5 text-white shadow-[0_12px_30px_rgba(16,185,129,0.2)] transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                Download TXT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}