"use client";

import { useEffect, useRef, useState } from "react";
import { ScanText } from "lucide-react";
import Tesseract from "tesseract.js";
import { extractWorkData } from "../../work-status/parser";
import { addWork } from "../../work-status/storage";

type QuickReceiptScanProps = {
  theme: "slate" | "green" | "blue" | "purple" | "amber" | "rose";
};

const scanThemeClasses: Record<QuickReceiptScanProps["theme"], {
  shell: string;
  icon: string;
  eyebrow: string;
  title: string;
  button: string;
}> = {
  slate: {
    shell: "border-slate-300 bg-slate-100 text-slate-900 shadow-slate-900/10 dark:border-blue-900 dark:bg-[#0d1b36] dark:text-slate-100",
    icon: "border-slate-300 bg-white text-slate-700 dark:border-blue-900 dark:bg-[#12284b] dark:text-cyan-200",
    eyebrow: "text-slate-500 dark:text-cyan-300",
    title: "text-slate-900 dark:text-white",
    button: "bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800",
  },
  green: {
    shell: "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-900/10 dark:border-emerald-900 dark:bg-[#0d2b2a] dark:text-emerald-100",
    icon: "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-[#123c38] dark:text-emerald-200",
    eyebrow: "text-emerald-700 dark:text-emerald-300",
    title: "text-emerald-950 dark:text-white",
    button: "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700",
  },
  blue: {
    shell: "border-blue-200 bg-blue-50 text-blue-950 shadow-blue-900/10 dark:border-blue-900 dark:bg-[#0d1b36] dark:text-blue-100",
    icon: "border-blue-200 bg-white text-blue-700 dark:border-blue-900 dark:bg-[#12284b] dark:text-blue-200",
    eyebrow: "text-blue-700 dark:text-blue-300",
    title: "text-blue-950 dark:text-white",
    button: "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700",
  },
  purple: {
    shell: "border-purple-200 bg-purple-50 text-purple-950 shadow-purple-900/10 dark:border-purple-900 dark:bg-[#201640] dark:text-purple-100",
    icon: "border-purple-200 bg-white text-purple-700 dark:border-purple-900 dark:bg-[#30205e] dark:text-purple-200",
    eyebrow: "text-purple-700 dark:text-purple-300",
    title: "text-purple-950 dark:text-white",
    button: "bg-purple-600 text-white shadow-purple-600/20 hover:bg-purple-700",
  },
  amber: {
    shell: "border-amber-200 bg-amber-50 text-amber-950 shadow-amber-900/10 dark:border-amber-900 dark:bg-[#32260d] dark:text-amber-100",
    icon: "border-amber-200 bg-white text-amber-700 dark:border-amber-900 dark:bg-[#4a3812] dark:text-amber-200",
    eyebrow: "text-amber-700 dark:text-amber-300",
    title: "text-amber-950 dark:text-white",
    button: "bg-amber-500 text-slate-950 shadow-amber-500/20 hover:bg-amber-600",
  },
  rose: {
    shell: "border-rose-200 bg-rose-50 text-rose-950 shadow-rose-900/10",
    icon: "border-rose-200 bg-white text-rose-700",
    eyebrow: "text-rose-700",
    title: "text-rose-950",
    button: "bg-rose-600 text-white shadow-rose-600/20 hover:bg-rose-700",
  },
};

export default function QuickReceiptScan({ theme }: QuickReceiptScanProps) {
  const activeTheme = scanThemeClasses[theme];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // =========================================================
  // PASTE IMAGE FROM CLIPBOARD
  // =========================================================

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) return;

      for (const item of items) {
        if (item.kind !== "file") continue;

        const file = item.getAsFile();

        if (!file) continue;

        await handleFile(file);
        break;
      }
    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  // =========================================================
  // IMAGE PREPROCESSING
  // =========================================================

  const preprocessImage = async (file: File): Promise<Blob> => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    try {
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = objectUrl;
      });

      const scale = 2;

      const canvas = document.createElement("canvas");

      canvas.width = image.naturalWidth * scale;
      canvas.height = image.naturalHeight * scale;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas not supported");
      }

      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

      const data = imageData.data;

      // Grayscale + contrast
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let gray =
          0.299 * r +
          0.587 * g +
          0.114 * b;

        // Increase contrast
        gray = (gray - 128) * 1.35 + 128;

        gray = Math.max(
          0,
          Math.min(255, gray)
        );

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);

      return await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(
                  new Error(
                    "Unable to create processed image"
                  )
                );
              }
            },
            "image/png",
            1
          );
        }
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  // =========================================================
  // NUMERIC OCR
  // =========================================================

  const runNumericOCR = async (
    image: Blob
  ): Promise<string> => {
    try {
      const result = await Tesseract.recognize(
        image,
        "eng",
        {
          logger: (info) => {
            if (
              info.status === "recognizing text" &&
              typeof info.progress === "number"
            ) {
              console.log(
                `Numeric OCR: ${Math.round(
                  info.progress * 100
                )}%`
              );
            }
          },
        }
      );

      return result.data.text || "";
    } catch (error) {
      console.error(
        "Numeric OCR failed:",
        error
      );

      return "";
    }
  };

  // =========================================================
  // NORMAL OCR
  // =========================================================

  const runNormalOCR = async (
    image: File | Blob
  ): Promise<string> => {
    const result = await Tesseract.recognize(
      image,
      "eng+mal",
      {
        logger: (info) => {
          if (
            info.status === "recognizing text" &&
            typeof info.progress === "number"
          ) {
            console.log(
              `OCR: ${Math.round(
                info.progress * 100
              )}%`
            );
          }
        },
      }
    );

    return result.data.text || "";
  };

  // =========================================================
  // EXTRA NUMBER OCR
  // =========================================================

  const runExtraNumberOCR = async (
    file: File
  ): Promise<string> => {
    try {
      const processed =
        await preprocessImage(file);

      const numericText =
        await runNumericOCR(processed);

      console.log(
        "========== NUMERIC OCR =========="
      );
      console.log(numericText);
      console.log(
        "================================="
      );

      return numericText;
    } catch (error) {
      console.error(
        "Extra numeric OCR error:",
        error
      );

      return "";
    }
  };

  // =========================================================
  // HANDLE FILE
  // =========================================================

  const handleFile = async (file: File) => {
    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      // -----------------------------------------------------
      // 1. NORMAL OCR
      // -----------------------------------------------------

      const normalText =
        await runNormalOCR(file);

      console.log(
        "========== OCR =========="
      );
      console.log(normalText);
      console.log(
        "========================="
      );

      // -----------------------------------------------------
      // 2. EXTRA NUMERIC OCR
      // -----------------------------------------------------

      const numericText =
        await runExtraNumberOCR(file);

      // -----------------------------------------------------
      // 3. COMBINE OCR RESULTS
      // -----------------------------------------------------

      const combinedText = [
        normalText,
        "",
        "===== EXTRA NUMERIC OCR =====",
        numericText,
      ].join("\n");

      console.log(
        "========== COMBINED OCR =========="
      );
      console.log(combinedText);
      console.log(
        "=================================="
      );

      // -----------------------------------------------------
      // 4. PARSE
      // -----------------------------------------------------

      const work =
        extractWorkData(combinedText);

      if (work) {
        const loggedUser = JSON.parse(
          localStorage.getItem(
            "loggedInUser"
          ) || "{}"
        );

        // ---------------------------------------------------
        // SAVE ORIGINAL RECEIPT IMAGE
        // ---------------------------------------------------

        const receiptUrl =
          await new Promise<string>(
            (resolve, reject) => {
              const reader =
                new FileReader();

              reader.onload = () =>
                resolve(
                  reader.result as string
                );

              reader.onerror = reject;

              reader.readAsDataURL(file);
            }
          );

        work.addedBy =
          loggedUser.username || "";

        work.staff =
          loggedUser.username || "";

        work.receiptUrl =
          receiptUrl;

        work.receiptType =
          file.type.includes("pdf")
            ? "pdf"
            : "image";

        // ---------------------------------------------------
        // SAVE
        // ---------------------------------------------------

        addWork(work);

        console.log(
          "========== FINAL WORK =========="
        );
        console.log(work);
        console.log(
          "================================"
        );

        setMessage(
          "Saved to Work Status"
        );
      } else {
        setMessage(
          "Required fields not detected."
        );
      }
    } catch (err) {
      console.error(
        "Quick Scan Error:",
        err
      );

      setMessage(
        "Failed to scan document."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className={`
        premium-tilt premium-shimmer
        flex
        w-[280px]
        max-w-full
        shrink-0
        items-center
        rounded-xl
        border
        px-2
        py-1.5
        shadow-[0_10px_25px_rgba(15,23,42,0.10)]
        transition-colors
        duration-300
        ${activeTheme.shell}
        backdrop-blur-xl
      `}
    >
      <div className="flex w-full min-w-0 items-center gap-2">

        {/* ICON */}
        <div
          className={`
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            transition-colors
            duration-300
            ${activeTheme.icon}
          `}
        >
          <ScanText size={17} />
        </div>

        {/* TEXT */}
        <div className="min-w-0 flex-1">
          <p
            className={`
              text-[8px]
              font-bold
              uppercase
              tracking-[0.16em]
              ${activeTheme.eyebrow}
            `}
          >
            QUICK SCAN
          </p>

          <p
            className={`
              truncate
              text-[11px]
              font-black
              leading-tight
              ${activeTheme.title}
            `}
          >
            {loading
              ? "Scanning..."
              : "Paste Image"}
          </p>

          {message && (
            <p
              className={`
                mt-0.5
                truncate
                text-[8px]
                font-bold
                ${
                  message ===
                  "Saved to Work Status"
                    ? "text-emerald-300"
                    : message ===
                      "Required fields not detected."
                    ? "text-yellow-300"
                    : "text-red-300"
                }
              `}
            >
              {message}
            </p>
          )}
        </div>

        {/* BROWSE BUTTON */}
        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
          disabled={loading}
          className={`
            shrink-0
            whitespace-nowrap
            rounded-lg
            px-2.5
            py-1.5
            text-[10px]
            font-black
            shadow-lg
            transition
            hover:-translate-y-0.5
            disabled:cursor-not-allowed
            disabled:opacity-60
            ${activeTheme.button}
          `}
        >
          {loading
            ? "Scanning..."
            : "Browse Image"}
        </button>

        {/* FILE INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file =
              e.target.files?.[0];

            if (file) {
              handleFile(file);
            }

            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
