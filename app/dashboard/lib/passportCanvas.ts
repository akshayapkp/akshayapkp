export interface PassportCanvasOptions {
  image: HTMLImageElement;
  copies: number;
  paperType: "A4" | "6x4";
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  backgroundColor: string;
  borderSize: number;
  imagePosition: {
    x: number;
    y: number;
  };
}

const LEGACY_MM_TO_PX = 3.7795275591;
const PRINT_DPI = 300;
const PRINT_MM_TO_PX = PRINT_DPI / 25.4;

export const PASSPORT_WIDTH = 31 * PRINT_MM_TO_PX;
export const PASSPORT_HEIGHT = 41 * PRINT_MM_TO_PX;

export const A4_WIDTH = Math.round(210 * PRINT_MM_TO_PX);
export const A4_HEIGHT = Math.round(297 * PRINT_MM_TO_PX);

export const PAPER_6X4_WIDTH = Math.round(152.4 * PRINT_MM_TO_PX);
export const PAPER_6X4_HEIGHT = Math.round(101.6 * PRINT_MM_TO_PX);

const PAGE_MARGIN = 60;

/*
 * A4-ൽ photo page edge-നോട് തട്ടിക്കിടക്കാതിരിക്കാൻ
 * ചെറിയ safe margin.
 *
 * 20px ≈ 1.7mm @ 300 DPI
 */
const A4_PAGE_MARGIN = 70;

/*
 * 6×4-ന്റെ നിലവിലുള്ള margin മാറ്റുന്നില്ല.
 */
const PHOTO_GAP = 60;

/*
 * A4 passport photo:
 * 35mm × 45mm @ 300 DPI
 */
const A4_PHOTO_WIDTH = 31 * PRINT_MM_TO_PX;
const A4_PHOTO_HEIGHT = 41 * PRINT_MM_TO_PX;

/*
 * A4 photos തമ്മിലുള്ള gap.
 */
const A4_PHOTO_GAP = 5 * PRINT_MM_TO_PX;

/*
 * Maximum copies.
 */
const MAX_A4_COPIES = 30;
const MAX_6X4_COPIES = 8;

export function createPassportCanvas(
  options: PassportCanvasOptions
) {
  const canvas = document.createElement("canvas");

  let paperWidth = A4_WIDTH;
  let paperHeight = A4_HEIGHT;

  if (options.paperType === "6x4") {
    paperWidth = PAPER_6X4_WIDTH;
    paperHeight = PAPER_6X4_HEIGHT;
  }

  canvas.width = Math.round(paperWidth);
  canvas.height = Math.round(paperHeight);

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  return {
    canvas,
    ctx,
  };
}

function calculateLayout(
  canvas: HTMLCanvasElement,
  options: PassportCanvasOptions
) {
  const isA4 = options.paperType === "A4";

  const photoWidth = isA4
    ? A4_PHOTO_WIDTH
    : PASSPORT_WIDTH;

  const photoHeight = isA4
    ? A4_PHOTO_HEIGHT
    : PASSPORT_HEIGHT;

  const photoGap = isA4
    ? A4_PHOTO_GAP
    : PHOTO_GAP;

  const maxCopies = isA4
    ? MAX_A4_COPIES
    : MAX_6X4_COPIES;

  /*
   * Never allow more than the paper-specific maximum.
   */
  const copies = Math.max(
    1,
    Math.min(
      Math.floor(options.copies || 1),
      maxCopies
    )
  );

  let cols: number;
  let rows: number;

  if (!isA4) {
    /*
     * 6 × 4
     *
     * 1 photo  → 1
     * 2 photos → 2
     * 3 photos → 2 + 1
     * 4 photos → 2 × 2
     * 5–8      → 4 per row
     *
     * Maximum = 8
     */
    if (copies <= 1) {
      cols = 1;
    } else if (copies <= 4) {
      cols = 2;
    } else {
      cols = 4;
    }

    rows = Math.ceil(copies / cols);
  } else {
    /*
     * A4
     *
     * Maximum 5 photos in one row.
     *
     * 1–5    → 1 row
     * 6–10   → 2 rows
     * 11–15  → 3 rows
     * ...
     * 26–30  → 6 rows
     */
    cols = Math.min(5, copies);

    rows = Math.ceil(copies / cols);
  }

  /*
   * IMPORTANT:
   *
   * Photos are NOT centered.
   *
   * They start from the top-left area of the sheet.
   *
   * A4 gets a slightly larger margin so that the
   * first photo does not touch the page edge.
   *
   * 6×4 keeps the previous margin unchanged.
   */
  const startX = isA4
    ? A4_PAGE_MARGIN
    : PAGE_MARGIN;

  const startY = isA4
    ? A4_PAGE_MARGIN
    : PAGE_MARGIN;

  return {
    photoWidth,
    photoHeight,
    cols,
    rows,
    startX,
    startY,
    photoGap,
    copies,
    maxCopies,
  };
}

export function drawPassportSheet(
  options: PassportCanvasOptions
) {
  const result = createPassportCanvas(options);

  if (!result) return null;

  const { canvas, ctx } = result;

  const {
    photoWidth,
    photoHeight,
    cols,
    startX,
    startY,
    photoGap,
    copies,
  } = calculateLayout(
    canvas,
    options
  );

  ctx.save();

  /*
   * Image adjustments.
   */
  ctx.filter = `
    brightness(${options.brightness}%)
    contrast(${options.contrast}%)
    saturate(${options.saturation}%)
    hue-rotate(${options.hue}deg)
  `;

  for (let i = 0; i < copies; i++) {
    /*
     * Row / column calculation.
     *
     * A4 example:
     *
     * 1  2  3  4  5
     * 6  7  8  9  10
     * 11 12 13 14 15
     *
     * 6×4 with 4:
     *
     * 1  2
     * 3  4
     */
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x =
      startX +
      col * (photoWidth + photoGap);

    const y =
      startY +
      row * (photoHeight + photoGap);

    /*
     * Fill photo frame.
     */
    ctx.fillStyle = options.backgroundColor;

    ctx.fillRect(
      x,
      y,
      photoWidth,
      photoHeight
    );

    ctx.save();

    /*
     * Move to the exact center of the photo frame.
     */
    ctx.translate(
      x + photoWidth / 2,
      y + photoHeight / 2
    );

    /*
     * Rotation.
     */
    ctx.rotate(
      (options.rotation * Math.PI) / 180
    );

    /*
     * Zoom.
     */
    const currentScale =
      options.zoom <= 5
        ? options.zoom
        : options.zoom / 100;

    ctx.scale(
      currentScale,
      currentScale
    );

    /*
     * Clip image to exact photo frame.
     */
    ctx.beginPath();

    ctx.rect(
      -photoWidth / 2,
      -photoHeight / 2,
      photoWidth,
      photoHeight
    );

    ctx.clip();

    /*
     * Image aspect ratio.
     */
    const imageRatio =
      options.image.width /
      options.image.height;

    const frameRatio =
      photoWidth / photoHeight;

    let drawWidth = photoWidth;
    let drawHeight = photoHeight;

    /*
     * Cover the complete frame without stretching.
     */
    if (imageRatio > frameRatio) {
      drawWidth =
        photoHeight * imageRatio;

      drawHeight = photoHeight;
    } else {
      drawWidth = photoWidth;

      drawHeight =
        photoWidth / imageRatio;
    }

    /*
     * High-quality rendering.
     */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    /*
     * Draw image.
     */
    ctx.drawImage(
      options.image,
      -drawWidth / 2 +
        options.imagePosition.x,
      -drawHeight / 2 +
        options.imagePosition.y,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    /*
     * ------------------------------------------------
     * BORDER
     * ------------------------------------------------
     *
     * Border is ALWAYS visible.
     *
     * Existing Border Size control is preserved.
     *
     * 1, 2, 3, 4, 5 etc. will continue to control
     * the border thickness.
     */
    ctx.strokeStyle = "#000000";

    ctx.lineWidth = Math.max(
      1,
      Number(options.borderSize) ||0
    );

    ctx.strokeRect(
      x,
      y,
      photoWidth,
      photoHeight
    );
  }

  ctx.restore();

  return canvas;
}