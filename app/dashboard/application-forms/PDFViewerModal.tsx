"use client";

import { useEffect, useState } from "react";

import {
  X,
  Download,
  Printer,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface PDFViewerModalProps {
  open: boolean;
  title: string;
  fileId: string;
  fileUrl?: string;
  onClose: () => void;
}

export default function PDFViewerModal({
  open,
  title,
  fileId,
  fileUrl,
  onClose,
}: PDFViewerModalProps) {
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () =>
      window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;
  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
  const downloadUrl = fileId.startsWith("link-") && fileUrl ? fileUrl : `https://drive.google.com/uc?export=download&id=${fileId}`;

  const toggleFullscreen = async () => {
    const element = document.getElementById("pdf-modal");

    if (!document.fullscreenElement) {
      await element?.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

const printPDF = async () => {
  try {
    const response = await fetch(`/api/print/${fileId}`);

    if (!response.ok) {
      throw new Error("Unable to load PDF");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.left = "-9999px";

    iframe.src = blobUrl;

    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };

    // ഉടൻ remove ചെയ്യരുത്.
    // Print dialog close ആകുന്നതുവരെ PDF memory-യിൽ ഇരിക്കട്ടെ.
    setTimeout(() => {
      try {
        iframe.remove();
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 60000);

  } catch (error) {
    console.error(error);
    alert("Unable to print this PDF.");
  }
};

  return (
<div
  className="absolute inset-0 z-50 flex bg-slate-950/55 backdrop-blur-md"
>
<div className="flex h-full w-full flex-col overflow-hidden border border-white/20 bg-slate-950/95 shadow-[0_30px_100px_rgba(2,6,23,0.5)] backdrop-blur-2xl">
        {/* Header */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/95 px-4 py-3.5 backdrop-blur-2xl sm:px-6">

          <div className="min-w-0">

            <h2 className="truncate text-base font-black tracking-tight text-white sm:text-lg">
              {title}
            </h2>

<div className="mt-1 flex items-center gap-2">

  <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-300">
    PDF
  </span>

  <span className="text-[11px] font-medium text-slate-400">
    Google Drive Preview
  </span>

</div>

          </div>

          <div className="flex min-w-[140px] items-center justify-center gap-2">

            <button
              onClick={toggleFullscreen}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300"
            >
              {fullscreen ? (
                <Minimize2 size={18} />
              ) : (
                <Maximize2 size={18} />
              )}
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition-all hover:-translate-y-0.5 hover:bg-rose-500/15 hover:text-rose-300"
            >
              <X size={20} />
            </button>

          </div>

        </div>
                {/* PDF Viewer */}

        <div className="relative min-h-0 flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">

          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">

              <div className="flex flex-col items-center">

                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent shadow-lg shadow-cyan-500/20" />

<div className="mt-4 text-center">

  <p className="text-sm font-semibold text-slate-200">
    Loading document...
  </p>

  <p className="mt-2 text-xs text-slate-500">
    Please wait while the PDF loads.
  </p>

</div>

              </div>

            </div>
          )}

          <iframe
            src={previewUrl}
            title={title}
            className="h-full w-full border-0"
            allow="autoplay"
            onLoad={() => setLoading(false)}
          />

        </div>

        {/* Footer */}

        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-white/10 bg-slate-900/95 px-4 py-3.5 sm:gap-3 sm:px-6">

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            <Download size={18} />
            Download
          </a>

          <button
            onClick={printPDF}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-slate-200 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-400/10"
          >
            <Printer size={18} />
            Print
          </button>

          <button
  onClick={() => {}}
  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
>
  <FaWhatsapp size={20} />
  WhatsApp
</button>

        </div>

      </div>

    </div>
  );
}