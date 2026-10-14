import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "serviceEntries",
  "billedServicesData",
  "performanceRecords",
  "smart_akshaya_bills",
  "savedBillsList",
]);

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server-side Supabase storage is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function recordId(record: any): string | null {
  const value = record?.id ?? record?.billId ?? record?.billID ?? record?.invoiceId;
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).slice(0, 200);
}

export async function GET() {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const db = getDb();
    const { data, error } = await db
      .from("akshaya_shared_records")
      .select("storage_key, record_id, payload, updated_at")
      .order("updated_at", { ascending: true });
    if (error) throw error;

    const records: Record<string, any[]> = {};
    for (const key of ALLOWED_KEYS) records[key] = [];
    for (const row of data ?? []) {
      if (ALLOWED_KEYS.has(row.storage_key)) records[row.storage_key].push(row.payload);
    }
    return NextResponse.json({ records });
  } catch (error) {
    console.error("Shared billing storage read failed", error);
    return NextResponse.json({ error: "Shared storage is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = String(body?.key ?? "");
  const records = body?.records;
  if (!ALLOWED_KEYS.has(key) || !Array.isArray(records) || records.length > 500) {
    return NextResponse.json({ error: "Invalid storage key or record list." }, { status: 400 });
  }

  const rows = [];
  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) continue;
    const id = recordId(record);
    if (!id) {
      return NextResponse.json(
        { error: "Every shared record must have a stable id, billId, billID, or invoiceId." },
        { status: 400 },
      );
    }
    rows.push({
      storage_key: key,
      record_id: id,
      payload: record,
      updated_at: new Date().toISOString(),
      updated_by: session.username,
    });
  }

  if (rows.length === 0) return NextResponse.json({ saved: 0 });

  try {
    const db = getDb();
    const { error } = await db
      .from("akshaya_shared_records")
      .upsert(rows, { onConflict: "storage_key,record_id" });
    if (error) throw error;
    return NextResponse.json({ saved: rows.length });
  } catch (error) {
    console.error("Shared billing storage write failed", error);
    return NextResponse.json({ error: "Shared storage is temporarily unavailable." }, { status: 503 });
  }
}
