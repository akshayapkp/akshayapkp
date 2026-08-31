"use client";

import { useEffect, useRef, useState } from "react";
import { ScanText } from "lucide-react";
import Tesseract from "tesseract.js";
import { extractWorkData } from "../../work-status/parser";
import { addWork } from "../../work-status/storage";

export default function QuickReceiptScan() {
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
      className="
        flex
        w-[280px]
        max-w-full
        shrink-0
        items-center
        rounded-xl
        border
        border-cyan-400/20
        bg-gradient-to-r
        from-slate-900/95
        via-slate-800/95
        to-cyan-950/90
        px-2
        py-1.5
        shadow-[0_10px_25px_rgba(6,182,212,0.14)]
        backdrop-blur-xl
      "
    >
      <div className="flex w-full min-w-0 items-center gap-2">

        {/* ICON */}
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-cyan-300/20
            bg-cyan-400/15
            text-cyan-200
          "
        >
          <ScanText size={17} />
        </div>

        {/* TEXT */}
        <div className="min-w-0 flex-1">
          <p
            className="
              text-[8px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-cyan-200/75
            "
          >
            QUICK SCAN
          </p>

          <p
            className="
              truncate
              text-[11px]
              font-black
              leading-tight
              text-white
            "
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
          className="
            shrink-0
            whitespace-nowrap
            rounded-lg
            bg-gradient-to-r
            from-cyan-400
            to-blue-500
            px-2.5
            py-1.5
            text-[10px]
            font-black
            text-slate-950
            shadow-lg
            shadow-cyan-500/20
            transition
            hover:-translate-y-0.5
            hover:shadow-cyan-500/30
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
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