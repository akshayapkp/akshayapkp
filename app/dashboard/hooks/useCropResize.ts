"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";

type Position = {
  x: number;
  y: number;
};

// Physical units are converted at 300 DPI.
// Pixel input remains exact pixels.
const DPI = 300;
const PX_PER_INCH = DPI;
const PX_PER_CM = DPI / 2.54;
const PX_PER_MM = DPI / 25.4;

export function useCropResize() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");

  const [targetWidth, setTargetWidth] = useState("150");
  const [targetHeight, setTargetHeight] = useState("200");
  const [selectedUnit, setSelectedUnit] = useState("px");

  const [minKb, setMinKb] = useState("15");
  const [maxKb, setMaxKb] = useState("300");

  const [zoomLevel, setZoomLevel] = useState(100);
  const [fineRotation, setFineRotation] = useState(0);

  const [removeBackground, setRemoveBackground] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessingBackground, setIsProcessingBackground] = useState(false);

  const [imagePosition, setImagePosition] = useState<Position>({
    x: 0,
    y: 0,
  });

  const isDraggingImageRef = useRef(false);
  const dragStartRef = useRef<Position>({ x: 0, y: 0 });

  const getComputedDimensions = () => {
    const rawW = parseFloat(targetWidth) || 150;
    const rawH = parseFloat(targetHeight) || 200;

    switch (selectedUnit) {
      case "cm":
        return {
          width: Math.max(1, Math.round(rawW * PX_PER_CM)),
          height: Math.max(1, Math.round(rawH * PX_PER_CM)),
        };
      case "mm":
        return {
          width: Math.max(1, Math.round(rawW * PX_PER_MM)),
          height: Math.max(1, Math.round(rawH * PX_PER_MM)),
        };
      case "inch":
        return {
          width: Math.max(1, Math.round(rawW * PX_PER_INCH)),
          height: Math.max(1, Math.round(rawH * PX_PER_INCH)),
        };
      default:
        return {
          width: Math.max(1, Math.round(rawW)),
          height: Math.max(1, Math.round(rawH)),
        };
    }
  };

  const uploadImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name);

    const reader = new FileReader();

    reader.onload = () => {
      setSelectedImage(String(reader.result));
      setProcessedImage(null);
      setZoomLevel(100);
      setFineRotation(0);
      setImagePosition({ x: 0, y: 0 });
    };

    reader.readAsDataURL(file);
  };

  const startDrag = (x: number, y: number) => {
    isDraggingImageRef.current = true;
    dragStartRef.current = {
      x: x - imagePosition.x,
      y: y - imagePosition.y,
    };
  };

  const moveDrag = (x: number, y: number) => {
    if (!isDraggingImageRef.current) return;

    setImagePosition({
      x: x - dragStartRef.current.x,
      y: y - dragStartRef.current.y,
    });
  };

  const stopDrag = () => {
    isDraggingImageRef.current = false;
  };

  const imageUrlToBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not read image.");
    return response.blob();
  };

  const configureContext = (ctx: CanvasRenderingContext2D) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  };

  const drawImageToCanvas = (
    img: HTMLImageElement,
    width: number,
    height: number,
    fillColor: string
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    configureContext(ctx);

    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((fineRotation * Math.PI) / 180);

    const scale =
      Math.max(width / img.naturalWidth, height / img.naturalHeight) *
      (zoomLevel / 100);

    ctx.scale(scale, scale);
    ctx.translate(imagePosition.x, imagePosition.y);

    ctx.drawImage(
      img,
      -img.naturalWidth / 2,
      -img.naturalHeight / 2,
      img.naturalWidth,
      img.naturalHeight
    );

    ctx.restore();

    return canvas;
  };

  const renderNormalCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!selectedImage) return null;

    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const { width, height } = getComputedDimensions();
        resolve(drawImageToCanvas(img, width, height, "#ffffff"));
      };

      img.onerror = () => resolve(null);
      img.src = selectedImage;
    });
  };

  const renderProcessedCanvas = async (
    transparentUrl: string
  ): Promise<HTMLCanvasElement | null> => {
    const img = new Image();

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("Could not load processed image."));
      img.src = transparentUrl;
    });

    const { width, height } = getComputedDimensions();
    return drawImageToCanvas(img, width, height, backgroundColor);
  };

  const renderCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (removeBackground && processedImage) {
      return renderProcessedCanvas(processedImage);
    }

    return renderNormalCanvas();
  };

  const [displayImage, setDisplayImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!selectedImage || !removeBackground) {
      setProcessedImage(null);
      setDisplayImage(selectedImage);
      setIsProcessingBackground(false);
      return;
    }

    const process = async () => {
      setIsProcessingBackground(true);
      setProcessedImage(null);
      setDisplayImage(null);

      try {
        const { removeBackground: removeBg } = await import(
          "@imgly/background-removal"
        );

        const sourceBlob = await imageUrlToBlob(selectedImage);

        const resultBlob = await removeBg(sourceBlob, {
          output: { format: "image/png" },
        });

        if (cancelled) return;

        const url = URL.createObjectURL(resultBlob);
        setProcessedImage(url);
      } catch (error) {
        console.error("Background removal failed:", error);
      } finally {
        if (!cancelled) setIsProcessingBackground(false);
      }
    };

    process();

    return () => {
      cancelled = true;
    };
  }, [selectedImage, removeBackground]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedImage) {
      setDisplayImage(null);
      return;
    }

    if (!removeBackground) {
      setDisplayImage(selectedImage);
      return;
    }

    if (!processedImage) return;

    renderProcessedCanvas(processedImage).then((canvas) => {
      if (!cancelled && canvas) {
        setDisplayImage(canvas.toDataURL("image/jpeg", 0.98));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    selectedImage,
    processedImage,
    removeBackground,
    backgroundColor,
    zoomLevel,
    fineRotation,
    imagePosition.x,
    imagePosition.y,
    targetWidth,
    targetHeight,
    selectedUnit,
  ]);

  const canvasToBlob = (
    canvas: HTMLCanvasElement,
    quality: number
  ): Promise<Blob | null> =>
    new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        quality
      );
    });

  /**
   * Browser canvas exports JPEGs with pixel dimensions, but normally does not
   * write the requested print DPI. Photoshop can therefore interpret a
   * 413x531 image as 145.7x187.3 mm at 72 DPI.
   *
   * This function writes real JFIF density metadata:
   * - units = 1 (pixels per inch)
   * - X density = 300
   * - Y density = 300
   *
   * The pixel dimensions are never changed.
   */
  const applyJpegDpi = async (
    blob: Blob,
    dpi = DPI
  ): Promise<Blob> => {
    const input = new Uint8Array(await blob.arrayBuffer());

    // A JPEG must start with SOI.
    if (input.length < 2 || input[0] !== 0xff || input[1] !== 0xd8) {
      return blob;
    }

    // Find an existing JFIF APP0 segment and update its density.
    let offset = 2;

    while (offset + 4 <= input.length) {
      if (input[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = input[offset + 1];

      // EOI / SOS: JFIF APP0 must be before these.
      if (marker === 0xda || marker === 0xd9) break;

      // Standalone markers do not have a segment length.
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        (marker >= 0xd0 && marker <= 0xd7)
      ) {
        offset += 2;
        continue;
      }

      if (offset + 4 > input.length) break;

      const segmentLength = (input[offset + 2] << 8) | input[offset + 3];

      if (
        marker === 0xe0 &&
        segmentLength >= 16 &&
        offset + 4 + segmentLength - 2 <= input.length
      ) {
        const idStart = offset + 4;

        if (
          input[idStart] === 0x4a && // J
          input[idStart + 1] === 0x46 && // F
          input[idStart + 2] === 0x49 && // I
          input[idStart + 3] === 0x46 && // F
          input[idStart + 4] === 0x00
        ) {
          const result = new Uint8Array(input);

          // JFIF density fields:
          // offset + 11 = units (1 = pixels/inch)
          // offset + 12..13 = Xdensity
          // offset + 14..15 = Ydensity
          //
          // The previous code started one byte too late, which caused
          // Photoshop/Windows to read the exported JPEG as 96 DPI even
          // though the canvas pixel dimensions were correct.
          result[offset + 11] = 1;
          result[offset + 12] = (dpi >> 8) & 0xff;
          result[offset + 13] = dpi & 0xff;
          result[offset + 14] = (dpi >> 8) & 0xff;
          result[offset + 15] = dpi & 0xff;

          return new Blob([result], { type: "image/jpeg" });
        }
      }

      // Protect against malformed JPEG segments.
      if (segmentLength < 2) break;

      offset += 2 + segmentLength;
    }

    // No JFIF APP0 was found. Insert one immediately after SOI.
    const app0 = new Uint8Array([
      0xff, 0xe0,             // APP0
      0x00, 0x10,             // segment length = 16
      0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF\0
      0x01, 0x02,             // version 1.02
      0x01,                   // units: pixels/inch
      (dpi >> 8) & 0xff, dpi & 0xff, // X density
      (dpi >> 8) & 0xff, dpi & 0xff, // Y density
      0x00, 0x00              // no thumbnail
    ]);

    const result = new Uint8Array(input.length + app0.length);
    result.set(input.subarray(0, 2), 0);
    result.set(app0, 2);
    result.set(input.subarray(2), 2 + app0.length);

    return new Blob([result], { type: "image/jpeg" });
  };

  const canvasToDpiJpeg = async (
    canvas: HTMLCanvasElement,
    quality: number
  ): Promise<Blob | null> => {
    const rawBlob = await canvasToBlob(canvas, quality);
    if (!rawBlob) return null;

    return applyJpegDpi(rawBlob, DPI);
  };

  const handleProcessAndDownloadImage = async () => {
    const canvas = await renderCanvas();
    if (!canvas) return;

    const requestedMinKb = Math.max(0, parseFloat(minKb) || 0);
    const requestedMaxKb = Math.max(0, parseFloat(maxKb) || 0);

    // Quality-first export. DPI metadata is applied before the size check so
    // the final downloaded file is the same file being size-tested.
    const qualitySteps = [
      0.98,
      0.96,
      0.94,
      0.92,
      0.90,
      0.88,
      0.85,
      0.82,
      0.78,
      0.74,
      0.70,
    ];

    let bestBlob: Blob | null = null;

    for (const quality of qualitySteps) {
      const blob = await canvasToDpiJpeg(canvas, quality);
      if (!blob) continue;

      bestBlob = blob;

      if (!requestedMaxKb || blob.size <= requestedMaxKb * 1024) {
        break;
      }
    }

    if (!bestBlob) return;

    const minBytes = requestedMinKb * 1024;

    if (bestBlob.size < minBytes) {
      const highQualityBlob = await canvasToDpiJpeg(canvas, 1);

      if (highQualityBlob && highQualityBlob.size >= bestBlob.size) {
        bestBlob = highQualityBlob;
      }
    }

    const url = URL.createObjectURL(bestBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      imageName.replace(/\.[^/.]+$/, "") + "-processed.jpg";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reset = () => {
    setSelectedImage(null);
    setImageName("");

    setTargetWidth("150");
    setTargetHeight("200");
    setSelectedUnit("px");

    setMinKb("15");
    setMaxKb("300");

    setZoomLevel(100);
    setFineRotation(0);

    setRemoveBackground(false);
    setBackgroundColor("#ffffff");
    setProcessedImage(null);
    setIsProcessingBackground(false);

    setImagePosition({ x: 0, y: 0 });
  };

  return {
    selectedImage,
    imageName,

    targetWidth,
    setTargetWidth,

    targetHeight,
    setTargetHeight,

    selectedUnit,
    setSelectedUnit,

    minKb,
    setMinKb,

    maxKb,
    setMaxKb,

    zoomLevel,
    setZoomLevel,

    fineRotation,
    setFineRotation,

    removeBackground,
    setRemoveBackground,

    backgroundColor,
    setBackgroundColor,

    processedImage,
    displayImage,
    isProcessingBackground,

    imagePosition,

    uploadImage,
    startDrag,
    moveDrag,
    stopDrag,

    reset,
    getComputedDimensions,
    handleProcessAndDownloadImage,
  };
}
