import { supabase } from "@/lib/supabase";

export const HOMEPAGE_POSTER_BUCKET = "homepage-posters";
export const HOMEPAGE_POSTER_MAX_BYTES = 8 * 1024 * 1024;

type StoredPoster = {
  publicUrl: string;
  storagePath: string;
};

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function optimizeImage(file: File): Promise<Blob> {
  if (file.size <= 2 * 1024 * 1024 && file.type === "image/webp") return file;

  const bitmap = await createImageBitmap(file);
  const maxSide = 2400;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser image canvas is unavailable.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86)
  );

  if (!blob) throw new Error("Image compression failed.");
  return blob;
}

export async function uploadHomepagePoster(file: File): Promise<StoredPoster> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  if (file.size > HOMEPAGE_POSTER_MAX_BYTES) {
    throw new Error("Poster image must be 8 MB or smaller.");
  }

  const optimized = await optimizeImage(file);
  const ext = optimized.type === "image/webp" ? "webp" : extensionFor(file.type);
  const storagePath = `homepage/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(HOMEPAGE_POSTER_BUCKET)
    .upload(storagePath, optimized, {
      cacheControl: "31536000",
      contentType: optimized.type || file.type,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from(HOMEPAGE_POSTER_BUCKET)
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, storagePath };
}

export async function deleteHomepagePoster(storagePath?: string) {
  if (!storagePath) return;
  const { error } = await supabase.storage
    .from(HOMEPAGE_POSTER_BUCKET)
    .remove([storagePath]);
  if (error) throw new Error(error.message);
}
