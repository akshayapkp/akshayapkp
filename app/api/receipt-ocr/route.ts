import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("OCR history database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Best-effort per-instance throttle; add an edge/WAF rate limit before broad public promotion.
const hits = new Map<string, { count: number; start: number }>();
function limited(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const prev = hits.get(forwarded);
  if (!prev || now - prev.start > 10 * 60_000) hits.set(forwarded, { count: 1, start: now });
  else { prev.count += 1; if (prev.count > 8) return true; }
  if (hits.size > 1000) for (const [key, value] of hits) if (now - value.start > 10 * 60_000) hits.delete(key);
  return false;
}

export async function POST(request: Request) {
  if (limited(request)) return NextResponse.json({ success: false, message: "Please wait before sending another receipt." }, { status: 429 });
  try {
    const body = await request.json();
    const text = String(body?.text || "").trim();
    if (text.length < 2) return NextResponse.json({ success: false, message: "No readable text was found." }, { status: 400 });
    if (text.length > 60_000) return NextResponse.json({ success: false, message: "Extracted text is too long." }, { status: 413 });
    const db = database();
    const { data, error } = await db.from("receipt_ocr_history").insert({
      id: randomUUID(), extracted_text: text, source: "mobile-camera", status: "pending"
    }).select("id, created_at").single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id, createdAt: data.created_at });
  } catch (error) {
    console.error("Public receipt OCR submit failed:", error);
    return NextResponse.json({ success: false, message: "Could not save the receipt. Please contact the centre." }, { status: 503 });
  }
}

export async function GET() {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ success: false, message: "Staff login required." }, { status: 401 });
  try {
    const db = database();
    const { data, error } = await db.from("receipt_ocr_history")
      .select("id, extracted_text, source, status, created_at, updated_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("Receipt OCR history load failed:", error);
    return NextResponse.json({ success: false, message: "Could not load history. Check database setup." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ success: false, message: "Staff login required." }, { status: 401 });
  try {
    const body = await request.json();
    const id = String(body?.id || "");
    const text = String(body?.text || "").trim();
    if (!id || text.length < 1 || text.length > 60_000) return NextResponse.json({ success: false, message: "Valid history ID and text are required." }, { status: 400 });
    const db = database();
    const { error } = await db.from("receipt_ocr_history").update({ extracted_text: text, status: "reviewed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Receipt OCR history update failed:", error);
    return NextResponse.json({ success: false, message: "Could not update this history item." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ success: false, message: "Staff login required." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const db = database();
    let query = db.from("receipt_ocr_history").delete();
    if (id) query = query.eq("id", id);
    const { error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Receipt OCR history delete failed:", error);
    return NextResponse.json({ success: false, message: "Could not delete history." }, { status: 503 });
  }
}
