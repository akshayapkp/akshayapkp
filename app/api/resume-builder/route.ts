import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Resume database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function metadata(data: any) {
  const p = data?.personal ?? {};
  return {
    display_name: String(p.name ?? "").trim().slice(0, 200),
    mobile: String((data?.contacts ?? []).find((x: any) => x?.number)?.number ?? "").trim().slice(0, 40),
    email: String(p.email ?? "").trim().slice(0, 320),
  };
}
function safeItem(row: any) {
  return {
    id: row.id,
    name: row.display_name || "Untitled",
    mobile: row.mobile || "",
    email: row.email || "",
    formatted_date: row.updated_at ? new Date(row.updated_at).toLocaleString("en-IN") : "",
  };
}

export async function GET(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ success: false, message: "Please sign in again." }, { status: 401 });
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "list";
    const db = database();
    if (action === "list") {
      const search = (url.searchParams.get("search") || "").trim().slice(0, 200);
      let query = db.from("resume_builder_resumes").select("id, data, display_name, mobile, email, created_by, created_at, updated_at").order("updated_at", { ascending: false }).limit(200);
      if (session.role !== "admin") query = query.eq("created_by", session.username);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []).filter((row: any) => !search || [row.display_name, row.mobile, row.email].some((v: string) => String(v ?? "").toLowerCase().includes(search.toLowerCase())));
      return NextResponse.json({ success: true, data: rows.map(safeItem) });
    }
    if (action === "get") {
      const id = url.searchParams.get("id");
      if (!id) return NextResponse.json({ success: false, message: "Resume ID is required." }, { status: 400 });
      let query = db.from("resume_builder_resumes").select("id, data, created_by").eq("id", id).limit(1);
      if (session.role !== "admin") query = query.eq("created_by", session.username);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ success: false, message: "Resume not found or access denied." }, { status: 404 });
      return NextResponse.json({ success: true, id: data.id, data: data.data });
    }
    return NextResponse.json({ success: false, message: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Resume Builder GET failed:", error);
    return NextResponse.json({ success: false, message: "Could not load resumes. Check server configuration." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ success: false, message: "Please sign in again." }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body?.action || "save");
    const id = String(body?.id || "");
    const db = database();
    if (action === "delete") {
      if (!id) return NextResponse.json({ success: false, message: "Resume ID is required." }, { status: 400 });
      let query = db.from("resume_builder_resumes").delete().eq("id", id);
      if (session.role !== "admin") query = query.eq("created_by", session.username);
      const { error, count } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!count && !error) {
        // Supabase may return no row for RLS-like filters; do not disclose other users' records.
      }
      return NextResponse.json({ success: true, message: "Resume deleted." });
    }
    if (action !== "save") return NextResponse.json({ success: false, message: "Unsupported action." }, { status: 400 });
    const data = body?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ success: false, message: "Resume data is invalid." }, { status: 400 });
    const serialized = JSON.stringify(data);
    if (serialized.length > 1_500_000) return NextResponse.json({ success: false, message: "Resume data is too large. Please use a smaller photo." }, { status: 413 });
    const meta = metadata(data);
    if (id) {
      let query = db.from("resume_builder_resumes").update({ data, ...meta, updated_at: new Date().toISOString() }).eq("id", id);
      if (session.role !== "admin") query = query.eq("created_by", session.username);
      const { data: saved, error } = await query.select("id").maybeSingle();
      if (error) throw error;
      if (!saved) return NextResponse.json({ success: false, message: "Resume not found or access denied." }, { status: 404 });
      return NextResponse.json({ success: true, id: saved.id, message: "Resume updated successfully." });
    }
    const { data: saved, error } = await db.from("resume_builder_resumes").insert({
      data, ...meta, created_by: session.username,
    }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: saved.id, message: "Resume saved successfully." });
  } catch (error) {
    console.error("Resume Builder POST failed:", error);
    return NextResponse.json({ success: false, message: "Could not save resume. Check server configuration." }, { status: 500 });
  }
}
