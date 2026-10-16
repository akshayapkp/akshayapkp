import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Income Affidavit database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const DEFAULTS = { preview: false, print: false, download: false };
function responseSettings(row: any) {
  return { preview: Boolean(row?.allow_customer_preview), print: Boolean(row?.allow_customer_print), download: Boolean(row?.allow_customer_download) };
}

// Public read exposes only the three non-sensitive form permissions.
export async function GET() {
  try {
    const { data, error } = await db().from("income_affidavit_settings")
      .select("allow_customer_preview,allow_customer_print,allow_customer_download")
      .eq("id", "global").maybeSingle();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: responseSettings(data || DEFAULTS) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Income Affidavit settings read failed:", error);
    return NextResponse.json({ success: false, settings: DEFAULTS, error: "Settings unavailable; customer actions remain hidden." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ error: "Staff login required." }, { status: 401 });
  try {
    const body = await request.json();
    if (!body || typeof body.preview !== "boolean" || typeof body.print !== "boolean" || typeof body.download !== "boolean" {
      return NextResponse.json({ error: "All access settings must be ON or OFF." }, { status: 400 });
    }
    const { data, error } = await db().from("income_affidavit_settings").upsert({
      id: "global", allow_customer_preview: body.preview, allow_customer_print: body.print,
      allow_customer_download: body.download, updated_at: new Date().toISOString(),
    }, { onConflict: "id" }).select("allow_customer_preview,allow_customer_print,allow_customer_download").single();
    if (error) throw error;
    return NextResponse.json({ success: true, settings: responseSettings(data) });
  } catch (error) {
    console.error("Income Affidavit settings update failed:", error);
    return NextResponse.json({ error: "Could not save shared customer access settings." }, { status: 503 });
  }
}
