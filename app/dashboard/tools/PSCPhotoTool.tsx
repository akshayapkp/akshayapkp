"use client";

import React, { useState } from "react";
import { AlertCircle, Save, Upload, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import SignatureTool from "./SignatureTool";
import { usePSCPhoto } from "../hooks/usePSCPhoto";

interface PSCPhotoToolProps {
  onClose: () => void;
}

export default function PSCPhotoTool({
  onClose,
}: PSCPhotoToolProps) {
  const psc = usePSCPhoto();

  const [activeTab, setActiveTab] = useState<"photo" | "signature">("photo");

  // Inline preview editing
  const [editingField, setEditingField] = useState<"name" | "date" | null>(null);

  // Convert DD-MM-YYYY -> YYYY-MM-DD for native date picker
  const dateToInputValue = (value: string) => {
    const parts = value.split("-");

    if (parts.length !== 3) return "";

    const [day, month, year] = parts;

    if (
      day.length !== 2 ||
      month.length !== 2 ||
      year.length !== 4
    ) {
      return "";
    }

    return `${year}-${month}-${day}`;
  };

  // Convert YYYY-MM-DD -> DD-MM-YYYY
  const inputValueToDate = (value: string) => {
    if (!value) return "";

    const parts = value.split("-");

    if (parts.length !== 3) return "";

    const [year, month, day] = parts;

    return `${day}-${month}-${year}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-md sm:p-5">
      <div className="my-4 flex max-h-[95vh] w-full max-w-6xl flex-col overflow-y-auto rounded-[30px] border border-white/80 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-2xl">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 px-5 py-5 text-white shadow-lg sm:px-7 sm:py-6">
          <div>
            <h3 className="text-2xl font-black tracking-tight">
              PSC Photo Creator
            </h3>

            <p className="text-xs font-medium text-teal-50/90">
              Kerala PSC standard photo & signature tools
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition-all hover:-translate-y-0.5 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6">

          {/* TABS */}
          <div className="mb-5 flex items-center gap-2 border-b border-slate-200/80 pb-4">

            <button
              onClick={() => setActiveTab("photo")}
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition-all duration-200 ${
                activeTab === "photo"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              PSC Photo
            </button>

            <button
              onClick={() => setActiveTab("signature")}
              className={`rounded-xl px-5 py-2.5 text-sm font-black transition-all duration-200 ${
                activeTab === "signature"
                  ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              PSC Signature
            </button>

          </div>

          {activeTab === "photo" ? (

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">

              {/* PREVIEW */}
              <section className="space-y-4 lg:col-span-7">

                <div className="relative flex min-h-[430px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm sm:min-h-[490px] sm:p-6">

                  <span className="absolute left-4 top-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    PSC Photo Preview
                  </span>

                  {/* ZOOM BUTTONS */}
                  <div className="absolute right-4 top-4 flex gap-2">

                    <button
                      onClick={() =>
                        psc.setZoom((value) =>
                          Math.min(value + 15, 400)
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                    >
                      <ZoomIn size={16} />
                    </button>

                    <button
                      onClick={() =>
                        psc.setZoom((value) =>
                          Math.max(value - 15, 20)
                        )
                      }
                      className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                    >
                      <ZoomOut size={16} />
                    </button>

                  </div>

                  {/* PHOTO CARD */}
                  <div
                    className="select-none overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
                    style={{
                      width: 225,
                      height: 300,
                    }}
                    onWheel={(event) => {
                      event.preventDefault();

                      psc.setZoom((value) =>
                        Math.min(
                          400,
                          Math.max(
                            20,
                            value +
                              (event.deltaY < 0
                                ? 15
                                : -15)
                          )
                        )
                      );
                    }}
                    onMouseDown={(event) =>
                      psc.startDrag(
                        event.clientX,
                        event.clientY
                      )
                    }
                    onMouseMove={(event) =>
                      psc.moveDrag(
                        event.clientX,
                        event.clientY
                      )
                    }
                    onMouseUp={psc.stopDrag}
                    onMouseLeave={psc.stopDrag}
                  >

                    {/* PHOTO AREA */}
                    <div
                      className="relative flex items-center justify-center overflow-hidden bg-slate-100"
                      style={{
                        width: 225,
                        height: 247,
                      }}
                    >

                      {!psc.photo ? (

                        <label className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white text-slate-400 transition-colors hover:text-teal-500">

                          <Upload size={26} />

                          <span className="mt-2 text-xs font-bold">
                            Click to Upload
                          </span>

                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                            onChange={psc.uploadPhoto}
                          />

                        </label>

                      ) : (

                        <div
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            transform: `translate(${psc.position.x}px, ${psc.position.y}px) scale(${psc.zoom / 100})`,
                          }}
                        >

                          <img
                            src={psc.photo}
                            alt="PSC Preview"
                            draggable={false}
                            className="pointer-events-none max-w-none select-none object-contain"
                            style={{
                              width: 225,
                            }}
                          />

                        </div>

                      )}

                    </div>

                    {/* NAME */}
                    <div
                      className="relative flex h-[27px] items-center justify-center border-t bg-white font-bold"
                      style={{
                        fontSize: Math.max(
                          14,
                          psc.nameFontSize
                        ),
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingField("name");
                      }}
                    >

                      {editingField === "name" ? (

                        <input
                          autoFocus
                          type="text"
                          value={psc.applicantName}
                          onChange={(event) =>
                            psc.setApplicantName(
                              event.target.value
                            )
                          }
                          onBlur={() =>
                            setEditingField(null)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              setEditingField(null);
                            }

                            if (event.key === "Escape") {
                              setEditingField(null);
                            }
                          }}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className="h-full w-full border-none bg-white px-2 text-center font-bold uppercase text-black outline-none"
                          style={{
                            fontSize: Math.max(
                              14,
                              psc.nameFontSize
                            ),
                          }}
                          placeholder="NAME"
                        />

                      ) : (

                        <span
                          className="cursor-text select-text text-black"
                          title="Click to edit name"
                        >
                          {(psc.applicantName || "NAME").toUpperCase()}
                        </span>

                      )}

                    </div>

                    {/* DATE */}
                    <div
                      className="relative flex h-[26px] items-center justify-center bg-white text-black"
                      style={{
                        fontSize: Math.max(
                          12,
                          psc.dateFontSize
                        ),
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingField("date");
                      }}
                    >

                      {editingField === "date" ? (

                        <div
                          className="absolute bottom-[30px] left-1/2 z-50 w-[205px] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_15px_40px_rgba(15,23,42,0.22)]"
                          onMouseDown={(event) =>
                            event.stopPropagation()
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >

                          <div className="mb-2 text-left text-[9px] font-black uppercase tracking-wider text-slate-400">
                            Edit Date
                          </div>

                          {/* MANUAL DATE INPUT */}
                          <input
                            autoFocus
                            type="text"
                            value={psc.photoDate}
                            placeholder="DD-MM-YYYY"
                            onChange={(event) =>
                              psc.setPhotoDate(
                                event.target.value
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                setEditingField(null);
                              }

                              if (event.key === "Escape") {
                                setEditingField(null);
                              }
                            }}
                            className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-xs font-bold text-black outline-none focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-500/10"
                          />

                          {/* DATE PICKER */}
                          <div className="flex items-center gap-2">

                            <Calendar
                              size={14}
                              className="text-teal-600"
                            />

                            <input
                              type="date"
                              value={dateToInputValue(
                                psc.photoDate
                              )}
                              onChange={(event) =>
                                psc.setPhotoDate(
                                  inputValueToDate(
                                    event.target.value
                                  )
                                )
                              }
                              className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10"
                            />

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingField(null)
                            }
                            className="mt-2 h-8 w-full rounded-lg bg-slate-900 text-[10px] font-black text-white transition hover:bg-slate-800"
                          >
                            Done
                          </button>

                        </div>

                      ) : (

                        <span
                          className="cursor-text select-text text-black"
                          title="Click to edit date"
                        >
                          {psc.photoDate ||
                            "DD-MM-YYYY"}
                        </span>

                      )}

                    </div>

                  </div>

                  <p className="absolute bottom-3 rounded-xl bg-white/80 px-3 py-1.5 text-[10px] font-bold text-slate-500 shadow-sm">
                    Output: 150 × 200 px
                  </p>

                </div>

                {/* INSTRUCTIONS */}
                <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-xs text-slate-600 shadow-sm backdrop-blur">

                  <p className="flex items-center gap-1.5 font-bold text-slate-800">
                    <AlertCircle
                      size={14}
                      className="text-teal-600"
                    />
                    Instructions
                  </p>

                  <p className="mt-1">
                    Mouse wheel ഉപയോഗിച്ച് zoom ചെയ്യുക.
                    ഫോട്ടോ click ചെയ്ത് drag ചെയ്ത്
                    ശരിയായ സ്ഥാനത്ത് വയ്ക്കുക.
                  </p>

                </div>

              </section>

              {/* RIGHT SETTINGS */}
              <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:col-span-5">

                <div>
                  <h4 className="text-lg font-black tracking-tight text-slate-800">
                    Create PSC Photo
                  </h4>

                  <p className="text-xs font-medium text-slate-500">
                    Upload, position, then download.
                  </p>
                </div>

                {/* UPLOAD */}
                <label className="group block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-50/30 hover:shadow-md">

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={psc.uploadPhoto}
                  />

                  <div className="flex items-center gap-3">

                    <span className="rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-3 text-white shadow-lg shadow-emerald-500/20">
                      <Upload size={18} />
                    </span>

                    <span className="min-w-0">

                      <b className="block truncate text-xs text-slate-800">
                        {psc.fileName ||
                          "Click to select photo"}
                      </b>

                      <small className="text-slate-400">
                        JPG, PNG
                      </small>

                    </span>

                  </div>

                </label>

                {/* NAME */}
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">

                  Name of Applicant

                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={psc.applicantName}
                    onChange={(event) =>
                      psc.setApplicantName(
                        event.target.value
                      )
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                  />

                </label>

                {/* DATE */}
                <label className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">

                  Photo Taken Date

                  <div className="relative mt-1">

                    <input
                      type="text"
                      placeholder="DD-MM-YYYY"
                      value={psc.photoDate}
                      onChange={(event) =>
                        psc.setPhotoDate(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-11 text-xs font-bold text-slate-800 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                    />

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-600 pointer-events-none">
                      <Calendar size={15} />
                    </div>

                  </div>

                </label>

                {/* NAME FONT */}
                <label className="block text-xs font-semibold text-slate-600">

                  Name Font Size: {psc.nameFontSize}px

                  <input
                    type="range"
                    min="10"
                    max="24"
                    value={psc.nameFontSize}
                    onChange={(event) =>
                      psc.setNameFontSize(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-emerald-600"
                  />

                </label>

                {/* DATE FONT */}
                <label className="block text-xs font-semibold text-slate-600">

                  Date Font Size: {psc.dateFontSize}px

                  <input
                    type="range"
                    min="8"
                    max="20"
                    value={psc.dateFontSize}
                    onChange={(event) =>
                      psc.setDateFontSize(
                        Number(event.target.value)
                      )
                    }
                    className="w-full accent-emerald-600"
                  />

                </label>

                {/* BUTTONS */}
                <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">

                  <button
                    disabled={!psc.photo}
                    onClick={psc.download}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 py-3.5 text-sm font-black text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Save size={16} />
                    Download Photo
                  </button>

                  <button
                    onClick={psc.reset}
                    className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                  >
                    Reset
                  </button>

                </div>

              </section>

            </div>

          ) : (

            <SignatureTool />

          )}

        </div>

      </div>
    </div>
  );
}