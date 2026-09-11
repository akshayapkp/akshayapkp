import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Keep the module import-safe when the optional Supabase integration is not connected.
// Supabase calls will fail normally and be handled by the existing fallbacks, instead of
// crashing the entire preview while createClient validates an empty URL.
const supabaseUrl = configuredSupabaseUrl || "http://localhost:54321";
const supabaseKey = configuredSupabaseKey || "preview-anon-key";

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
