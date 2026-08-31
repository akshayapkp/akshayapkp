"use client";

import {
  Camera,
  Download,
  RefreshCcw,
  Upload,
  X,
} from "lucide-react";

import { usePassportSize } from "../hooks/usePassportSize";
import { drawPassportSheet } from "../lib/passportCanvas";
import PassportCropDialog from "../components/PassportCropDialog";

interface PassportSizeProps {
  onClose?: () => void;
}

export default function PassportSize({
  onClose,
}: PassportSizeProps) {
  const {
    fileInputRef,
    previewContainerRef,
    previewCanvasRef,
    image,
    imagePosition,
    paperType,
    copies,
    borderSize,
    backgroundColor,
    brightness,
    contrast,
    saturation,
    hue,
    zoom,
    rotation,
    setPaperType,
    setCopies,
    setBorderSize,
    setBackgroundColor,
    setBrightness,
    setContrast,
    setSaturation,
    setHue,
    setZoom,
    setRotation,
    handleSelectImage,
    openFilePicker,
    handleDrop,
    handleDragOver,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    cropOpen,
    setCropOpen,
    cropImage,
    setCropImage,
    setImage,
    resetAll,
  } = usePassportSize();

  const handleDownload = async () => {
    if (!image) return;

    const img = new Image();
    img.src = image;

    img.onload = () => {
      const canvas = drawPassportSheet({
        image: img,
        paperType,
        copies,
        borderSize,
        backgroundColor,
        brightness,
        contrast,
        saturation,
        hue,
        zoom,
        rotation,
        imagePosition,
      });

      if (!canvas) return;

      const link = document.createElement("a");
      link.download = "passport-photo-sheet.jpg";
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    };
  };

  const handleCropSave = (cropped: string) => {
    setImage(cropped);
    setCropImage(null);
    setCropOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[99999] overflow-auto bg-slate-950/65 backdrop-blur-md">
        <div className="flex min-h-screen items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-6xl overflow-hidden rounded-[30px] border border-white/70 bg-slate-50/95 shadow-[0_30px_100px_rgba(15,23,42,0.3)] backdrop-blur-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-rose-600 via-pink-600 to-fuchsia-700 px-5 py-5 text-white shadow-lg sm:px-7 sm:py-6">
              <div>
                <h1 className="text-2xl font-black leading-none tracking-tight sm:text-[28px]">
                  Passport Photo Creator
                </h1>
                <p className="mt-2 text-sm text-white/80">
                  Generate and print multi-photo sheets
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={openFilePicker}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:h-12 sm:w-12"
                >
                  <Camera size={24} />
                </button>

                {onClose && (
                  <button
                    onClick={onClose}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/20 sm:h-12 sm:w-12"
                  >
                    <X size={22} />
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="image/*"
              onChange={handleSelectImage}
            />

            <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:gap-5 lg:p-6 xl:grid-cols-[1.35fr_0.85fr]">
              
              {/* ===========================
                  LEFT PANEL (Live Preview)
              =========================== */}
              <div className="overflow-hidden rounded-[26px] border border-white/80 bg-white/90 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Live Preview
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                    {paperType === "A4"
                      ? "A4 Paper (210 × 297 mm)"
                      : '6" × 4" Paper (152 × 102 mm)'}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <div
                    ref={previewContainerRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 p-3 sm:min-h-[500px] lg:min-h-[520px]"
                  >
                    <div
                      className={`flex items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.12)] ${
                        paperType === "A4"
                          ? "w-[360px] h-[510px]"
                          : "w-[430px] h-[286px]"
                      }`}
                    >
                      <canvas
                        ref={previewCanvasRef}
                        className="w-full h-full object-contain bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-center pt-5 sm:pt-7">
                    <button
                      type="button"
                      disabled={!image}
                      onClick={handleDownload}
                      className="flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl bg-slate-200 font-black text-white shadow-sm transition-all enabled:bg-gradient-to-r enabled:from-rose-600 enabled:to-pink-600 enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg"
                    >
                      <Download size={18} />
                      Download Sheet
                    </button>
                  </div>
                </div>
              </div>

              {/* ===========================
                  RIGHT PANEL
              =========================== */}
              <div className="space-y-4 sm:space-y-5">
                
                {/* Initial Source & Background */}
                <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                  <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-500">
                    Initial Source & Background
                  </h3>

                  <div
                    onClick={openFilePicker}
                    className="group mt-5 flex h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-50/40 hover:shadow-md"
                  >
                    <Upload size={20} className="text-slate-500 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      Choose Photo or Drag & Drop
                    </p>
                  </div>
                </div>

                {/* Print Parameters */}
                <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                  <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Print Parameters
                  </h3>

                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        Paper Size
                      </label>
                      <select
                        value={paperType}
                        onChange={(e) => {
                          const nextPaperType = e.target.value as "A4" | "6x4";
                          setPaperType(nextPaperType);

                          const maxCopies = nextPaperType === "6x4" ? 8 : 30;
                          setCopies((current) => Math.min(current, maxCopies));
                        }}
                        className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      >
                        <option value="A4">A4 Paper</option>
                        <option value="6x4">6 × 4 Paper</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        Bg Color
                      </label>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="mt-2 h-10 w-10 cursor-pointer rounded-xl border border-slate-300 shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        Number of Copies
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={paperType === "6x4" ? 8 : 30}
                        value={copies === 0 ? "" : copies}
                        onChange={(e) => {
                          const rawValue = e.target.value;

                          if (rawValue === "") {
                            setCopies(0);
                            return;
                          }

                          const value = Number(rawValue);
                          const maxCopies = paperType === "6x4" ? 8 : 30;

                          setCopies(
                            Math.max(
                              0,
                              Math.min(maxCopies, Number.isFinite(value) ? value : 0)
                            )
                          );
                        }}
                        className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-semibold outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        Border Size (px)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={borderSize === 0 ? "" : borderSize}
                        onChange={(e) => {
                          const rawValue = e.target.value;

                          if (rawValue === "") {
                            setBorderSize(0);
                            return;
                          }

                          const value = Number(rawValue);

                          setBorderSize(
                            Math.max(
                              0,
                              Math.min(
                                20,
                                Number.isFinite(value) ? value : 0
                              )
                            )
                          );
                        }}
                        className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-semibold outline-none transition focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                      />
                    </div>
                  </div>
                </div>

                {/* Fine Tuning */}
                <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_10px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                  <h3 className="mb-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Fine Tuning Adjustments
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">Brightness</label>
                      <input type="range" min={0} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="mt-2 w-full accent-rose-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">Contrast</label>
                      <input type="range" min={0} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="mt-2 w-full accent-rose-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">Saturation</label>
                      <input type="range" min={0} max={200} value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="mt-2 w-full accent-rose-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">Zoom</label>
                      <input type="range" min={50} max={250} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-2 w-full accent-rose-600" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 sm:text-[11px]">Rotation</label>
                      <input type="range" min={-180} max={180} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="mt-2 w-full accent-rose-600" />
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={resetAll}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                    >
                      <RefreshCcw size={16} />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={!image}
                      className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 font-black text-white shadow-lg shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300 disabled:from-slate-300 disabled:to-slate-300"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Crop Dialog Component */}
      <PassportCropDialog
        open={cropOpen}
        image={cropImage}
        onCancel={() => setCropOpen(false)}
        onSave={handleCropSave}
      />
    </>
  );
}