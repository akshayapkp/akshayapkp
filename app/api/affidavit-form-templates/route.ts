import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Affidavit form templates database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const FIELD_TYPES = new Set(["text", "textarea", "date"]);
function cleanForm(input: any) {
  if (!input || typeof input !== "object") return null;
  const id = String(input.id || "");
  const title = String(input.title || "").trim();
  const fields = Array.isArray(input.fields) ? input.fields : [];
  if (!/^custom_[a-zA-Z0-9_-]{5,80}$/.test(id) || !title || title.length > 140 || fields.length < 1 || fields.length > 80) return null;
  const cleanFields = fields.map((field: any, index: number) => ({
    id: "f_" + index,
    label: String(field?.label || "").trim().slice(0, 160),
    type: FIELD_TYPES.has(field?.type) ? field.type : "text",
  })).filter((field: any) => field.label);
  if (!cleanFields.length) return null;
  return {
    id, title, subtitle: String(input.sub || "").trim().slice(0, 240),
    declaration: String(input.declaration || "").trim().slice(0, 6000),
    fields: cleanFields,
  };
}

async function requireAdmin() {
  const session = await getResumeSession();
  if (!session) return { error: NextResponse.json({ error: "Staff login required." }, { status: 401 }) };
  if (String(session.role).toLowerCase() !== "admin") return { error: NextResponse.json({ error: "Only Admin can manage form templates." }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  try {
    const { data, error } = await db().from("affidavit_form_templates")
      .select("id,title,subtitle,declaration,fields,is_active,created_at,updated_at")
      .eq("is_active", true).order("created_at", { ascending: true }).limit(200);
    if (error) throw error;
    const forms = (data || []).map((row: any) => ({
      id: row.id, title: row.title, sub: row.subtitle || "",
      declaration: row.declaration || "", fields: Array.isArray(row.fields) ? row.fields : [],
    }));
    return NextResponse.json({ success: true, forms }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Affidavit form templates read failed:", error);
    return NextResponse.json({ success: false, forms: [], error: "Form templates database is not ready. Apply the supplied Supabase migration." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  try {
    const body = await request.json();
    const form = cleanForm(body?.form);
    if (!form) return NextResponse.json({ error: "Please provide a title and at least one valid field (maximum 80)." }, { status: 400 });
    const { data, error } = await db().from("affidavit_form_templates").upsert({
      id: form.id, title: form.title, subtitle: form.subtitle,
      declaration: form.declaration, fields: form.fields,
      is_active: true, created_by: auth.session!.username,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Affidavit form template save failed:", error);
    return NextResponse.json({ error: "Could not save the form template. Check the Supabase migration and service-role configuration." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^custom_[a-zA-Z0-9_-]{5,80}$/.test(id)) return NextResponse.json({ error: "A valid custom form ID is required." }, { status: 400 });
  try {
    const { error } = await db().from("affidavit_form_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Affidavit form template delete failed:", error);
    return NextResponse.json({ error: "Could not delete the form template." }, { status: 503 });
  }
}
