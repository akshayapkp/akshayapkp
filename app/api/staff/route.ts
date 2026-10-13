import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";

async function adminDb() {
  const session = await getResumeSession();
  if (!session || session.role.toLowerCase() !== "admin") {
    return { response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return { response: NextResponse.json({ error: "Staff database is not configured." }, { status: 503 }) };
  }
  return { db: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) };
}

const publicFields = "id, staff_id, name, email, phone, role, salary, upi_id, created_at";

function normalize(input: any) {
  return {
    id: String(input.id ?? Date.now()),
    staff_id: String(input.staff_id ?? input.staffId ?? ""),
    name: String(input.name ?? "").trim(),
    email: String(input.email ?? ""),
    phone: String(input.phone ?? ""),
    role: String(input.role ?? "Staff"),
    salary: Number(input.salary ?? 0) || 0,
    upi_id: String(input.upi_id ?? input.upiId ?? ""),
    password: String(input.password ?? ""),
  };
}

export async function GET() {
  const auth = await adminDb();
  if ("response" in auth) return auth.response;
  let { data, error } = await auth.db.from("staff").select(publicFields).order("created_at", { ascending: true });

  // Some deployments have an outdated service-role key while the publishable
  // key is still valid. Staff management is already protected by the admin
  // session, so retry reads with the anon key to keep the directory available.
  if (error && /invalid api key/i.test(error.message ?? "")) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey && anonKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const fallbackDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      ({ data, error } = await fallbackDb.from("staff").select(publicFields).order("created_at", { ascending: true }));
    }
  }

  if (error) {
    console.error("[staff-api] GET query failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const diagnosticCode = error.code ?? "UNKNOWN";
    const diagnosticMessage = error.message ?? "Unknown database error";
    return NextResponse.json(
      {
        error: `Unable to load staff records (database code ${diagnosticCode}): ${diagnosticMessage}`,
        diagnostic: { code: diagnosticCode, message: diagnosticMessage },
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await adminDb();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const inputs = body?.action === "migrate" ? body.staff : [body?.staff ?? body];
    if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > 100) {
      return NextResponse.json({ error: "No valid staff records were provided." }, { status: 400 });
    }
    const { count, error: countError } = await auth.db.from("staff").select("id", { count: "exact", head: true });
    if (countError) return NextResponse.json({ error: "Unable to check existing staff records." }, { status: 500 });
    if (body?.action === "migrate" && (count ?? 0) > 0) {
      return NextResponse.json({ error: "Staff table already has records; migration skipped to protect existing data." }, { status: 409 });
    }
    const rows = inputs.map(normalize);
    if (rows.some(row => !row.id || !row.staff_id || !row.name || !row.password)) {
      return NextResponse.json({ error: "Each staff record needs an ID, staff ID, name and password." }, { status: 400 });
    }
    const { data, error } = await auth.db.from("staff").insert(rows).select(publicFields);
    if (error) return NextResponse.json({ error: "Unable to save staff records. Check the staff table schema." }, { status: 500 });
    return NextResponse.json({ staff: data ?? [] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await adminDb();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const id = String(body?.id ?? "");
    const input = body?.staff ?? {};
    if (!id || !String(input.name ?? "").trim()) {
      return NextResponse.json({ error: "Staff ID and name are required." }, { status: 400 });
    }
    const update: Record<string, unknown> = {
      name: String(input.name).trim(),
      email: String(input.email ?? ""),
      phone: String(input.phone ?? ""),
      role: String(input.role ?? "Staff"),
      salary: Number(input.salary ?? 0) || 0,
      upi_id: String(input.upi_id ?? input.upiId ?? ""),
    };
    if (String(input.password ?? "").trim()) update.password = String(input.password).trim();
    const { data, error } = await auth.db.from("staff").update(update).eq("id", id).select(publicFields).single();
    if (error) return NextResponse.json({ error: "Unable to update staff record." }, { status: 500 });
    return NextResponse.json({ staff: data });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await adminDb();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "Staff ID is required." }, { status: 400 });
    const { error } = await auth.db.from("staff").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Unable to delete staff record." }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
