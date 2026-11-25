"use client";

import React, { useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FilePlus2,
  FileText,
  Image as ImageIcon,
  Lock,
  Merge,
  RefreshCw,
  RotateCw,
  Scissors,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";

interface PDFToolkitProps {
  onClose: () => void;
  standalone?: boolean;
}

type ToolMode = "convert" | "merge" | "split" | "rotate";

interface SelectedFile {
  id: string;
  file: File;
  preview?: string;
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function PDFToolkitTool({ onClose, standalone = false }: PDFToolkitProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [mode, setMode] = useState<ToolMode>("convert");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [outputName, setOutputName] = useState("converted-document.pdf");
  const [rotation, setRotation] = useState(90);
  const [selectedPage, setSelectedPage] = useState(1);
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(1);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const accept =
    mode === "convert"
      ? "application/pdf,image/jpeg,image/png,image/webp"
      : "application/pdf";

  const addFiles = (incoming: FileList | File[]) => {
    const accepted = Array.from(incoming).filter((file) => {
      if (mode === "convert") {
        return (
          file.type === "application/pdf" ||
          file.type.startsWith("image/")
        );
      }
      return file.type === "application/pdf";
    });

    const mapped = accepted.map((file) => ({
      id: uid(),
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));

    setFiles((prev) => [...prev, ...mapped]);
    setMessage("");
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const item = prev.find((x) => x.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearFiles = () => {
    files.forEach((item) => {
      if (item.preview) URL.revokeObjectURL(item.preview);
    });
    setFiles([]);
    setMessage("");
  };

  const reorder = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) return;

    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });

    setDragIndex(null);
  };

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const imageToPngBytes = async (file: File) => {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available.");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) throw new Error("Could not prepare image.");
    return new Uint8Array(await blob.arrayBuffer());
  };

  const createPdfFromImages = async (items: SelectedFile[]) => {
    const pdf = await PDFDocument.create();

    for (const item of items) {
      const png = await imageToPngBytes(item.file);
      const image = await pdf.embedPng(png);

      const maxWidth = 595;
      const maxHeight = 842;
      const scale = Math.min(
        maxWidth / image.width,
        maxHeight / image.height,
        1
      );

      const width = image.width * scale;
      const height = image.height * scale;

      const page = pdf.addPage([maxWidth, maxHeight]);
      page.drawImage(image, {
        x: (maxWidth - width) / 2,
        y: (maxHeight - height) / 2,
        width,
        height,
      });
    }

    return pdf.save();
  };

  const mergePdfs = async (items: SelectedFile[]) => {
    const output = await PDFDocument.create();

    for (const item of items) {
      const bytes = await item.file.arrayBuffer();
      const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await output.copyPages(
        source,
        source.getPageIndices()
      );
      pages.forEach((page) => output.addPage(page));
    }

    return output.save({ useObjectStreams: true });
  };

  const rotatePdf = async (item: SelectedFile) => {
    const bytes = await item.file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });

    pdf.getPages().forEach((page) => {
      const current = page.getRotation().angle;
      page.setRotation(degrees(current + rotation));
    });

    return pdf.save({ useObjectStreams: true });
  };

  const splitPdf = async (item: SelectedFile) => {
    const bytes = await item.file.arrayBuffer();
    const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const total = source.getPageCount();

    const start = Math.max(1, Math.min(fromPage, total)) - 1;
    const end = Math.max(start + 1, Math.min(toPage, total));

    const output = await PDFDocument.create();
    const pages = await output.copyPages(
      source,
      Array.from({ length: end - start }, (_, i) => start + i)
    );

    pages.forEach((page) => output.addPage(page));
    return output.save({ useObjectStreams: true });
  };

  const process = async () => {
    if (!files.length) {
      setMessage("Please select at least one file.");
      return;
    }

    setProcessing(true);
    setMessage("");

    try {
      let bytes: Uint8Array;

      if (
        mode === "convert" &&
        files.every((item) => item.file.type.startsWith("image/"))
      ) {
        bytes = await createPdfFromImages(files);
      } else if (mode === "merge") {
        bytes = await mergePdfs(files);
      } else if (mode === "rotate") {
        bytes = await rotatePdf(files[0]);
      } else if (mode === "split") {
        bytes = await splitPdf(files[0]);
      } else if (
        mode === "convert" &&
        files.every((item) => item.file.type === "application/pdf")
      ) {
        bytes = await mergePdfs(files);
      } else {
        throw new Error(
          "For PDF and image conversion, select compatible files together."
        );
      }

      // Create a plain ArrayBuffer so TypeScript/DOM BlobPart types
      // remain compatible with newer TypeScript lib definitions.
      const blobBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(blobBuffer).set(bytes);
      const blob = new Blob([blobBuffer], { type: "application/pdf" });

      let name = outputName.trim() || "document.pdf";
      if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";

      downloadBlob(blob, name);
      setMessage("PDF created and downloaded successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "PDF processing failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const changeMode = (next: ToolMode) => {
    setMode(next);
    setMessage("");
    clearFiles();

    if (next === "convert") {
      setOutputName("converted-document.pdf");
    } else if (next === "merge") {
      setOutputName("merged-document.pdf");
    } else if (next === "split") {
      setOutputName("extracted-pages.pdf");
    } else {
      setOutputName("rotated-document.pdf");
    }
  };

  const modeTitle: Record<ToolMode, string> = {
    convert: "PDF Converter",
    merge: "Merge PDF",
    split: "Split / Extract PDF",
    rotate: "Rotate PDF",
  };

  return (
    <div className={standalone ? "flex h-full min-h-0 w-full items-stretch justify-center overflow-hidden bg-white" : "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"}>
      <div className={standalone ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-white" : "flex h-[96vh] w-full max-w-[1250px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"}>
        {/* Header */}
        <header className="shrink-0 border-b border-slate-300 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white">
                <FileText className="text-red-600" size={28} />
              </div>

              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  Online PDF Tool
                </h2>
                <p className="text-xs text-slate-500">
                  Convert, merge, split and edit PDF files
                </p>
              </div>
            </div>

            {!standalone && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100"
              title="Close"
            >
              <X size={19} />
            </button>)}
          </div>

          <nav className="flex flex-wrap items-center gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 px-3 py-2">
            <button
              type="button"
              onClick={() => changeMode("convert")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                mode === "convert"
                  ? "bg-red-700 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              PDF Converter
            </button>

            <button
              type="button"
              onClick={() => changeMode("merge")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                mode === "merge"
                  ? "bg-red-700 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              Merge PDF
            </button>

            <button
              type="button"
              onClick={() => changeMode("split")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                mode === "split"
                  ? "bg-red-700 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              Split PDF
            </button>

            <button
              type="button"
              onClick={() => changeMode("rotate")}
              className={`rounded-md px-4 py-2 text-sm font-bold transition ${
                mode === "rotate"
                  ? "bg-red-700 text-white"
                  : "text-slate-700 hover:bg-white"
              }`}
            >
              Rotate PDF
            </button>

            <span className="ml-auto hidden text-xs text-slate-500 md:block">
              Local processing • Your files stay in the browser
            </span>
          </nav>
        </header>

        {/* Body */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <div className="mx-auto max-w-5xl p-4 sm:p-7">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                addFiles(event.dataTransfer.files);
              }}
              className="mb-5 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 transition hover:border-red-400"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                    <Upload size={21} />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-black text-slate-900">
                      {modeTitle[mode]}
                    </h1>
                    <p className="text-xs text-slate-500">
                      Drop files here or select files
                      <span className="mx-1">•</span>
                      {mode === "convert"
                        ? "PDF, JPG, PNG, WEBP"
                        : "PDF only"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-red-800"
                >
                  <Upload size={17} />
                  Select Files
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  multiple={mode === "convert" || mode === "merge"}
                  accept={accept}
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files) addFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            </div>

            {files.length > 0 && (
              <section className="mt-5 rounded-xl border border-slate-300 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="font-black text-slate-900">
                      Selected files
                    </h3>
                    <p className="text-xs text-slate-500">
                      {mode === "merge"
                        ? "Drag files to change their order."
                        : `${files.length} file${files.length === 1 ? "" : "s"} selected.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearFiles}
                    className="text-xs font-bold text-red-700 hover:underline"
                  >
                    Remove all
                  </button>
                </div>

                <div className="space-y-2 p-4">
                  {files.map((item, index) => (
                    <div
                      key={item.id}
                      draggable={mode === "merge"}
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={() => reorder(index)}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-700 text-sm font-black text-white">
                        {index + 1}
                      </div>

                      {item.preview ? (
                        <img
                          src={item.preview}
                          alt=""
                          className="h-12 w-12 rounded border border-slate-300 object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded border border-slate-300 bg-white">
                          <FileText className="text-red-600" size={23} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(item.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                        title="Remove"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {mode === "split" && files.length > 0 && (
              <section className="mt-5 rounded-xl border border-slate-300 bg-white p-5">
                <h3 className="font-black text-slate-900">Page range</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold text-slate-700">
                    From page
                    <input
                      type="number"
                      min={1}
                      value={fromPage}
                      onChange={(e) => setFromPage(Number(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-red-600"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    To page
                    <input
                      type="number"
                      min={1}
                      value={toPage}
                      onChange={(e) => setToPage(Number(e.target.value))}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-red-600"
                    />
                  </label>
                </div>
              </section>
            )}

            {mode === "rotate" && files.length > 0 && (
              <section className="mt-5 rounded-xl border border-slate-300 bg-white p-5">
                <h3 className="font-black text-slate-900">Rotation</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[90, 180, 270].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRotation(value)}
                      className={`rounded-lg border px-4 py-2 text-sm font-bold ${
                        rotation === value
                          ? "border-red-700 bg-red-700 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {value}°
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-5 rounded-xl border border-slate-300 bg-white p-5">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="text-sm font-bold text-slate-700">
                  Output file name
                  <input
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-red-600"
                  />
                </label>

                <button
                  type="button"
                  disabled={!files.length || processing}
                  onClick={process}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-red-700 px-7 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Download size={17} />
                      Convert & Download
                    </>
                  )}
                </button>
              </div>

              {message && (
                <div
                  className={`mt-4 rounded-lg border p-3 text-sm font-semibold ${
                    message.includes("successfully")
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}
            </section>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Feature icon={<Merge size={18} />} title="Merge PDF" />
              <Feature icon={<Scissors size={18} />} title="Split PDF" />
              <Feature icon={<RotateCw size={18} />} title="Rotate PDF" />
              <Feature icon={<ImageIcon size={18} />} title="Images to PDF" />
            </div>

            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
              Files are processed locally in your browser using PDF libraries.
              They are not uploaded to an external PDF website by this tool.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-red-700">{icon}</div>
      <span className="text-sm font-bold text-slate-700">{title}</span>
    </div>
  );
}
