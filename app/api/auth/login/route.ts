import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResumeSessionToken, resumeSessionCookie } from "@/lib/resume-auth";
import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function matches(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!username || !password || username.length > 200 || password.length > 500) {
      return NextResponse.json({ success: false, message: "Enter username and password." }, { status: 400 });
    }

    let role = "";
    let displayName = "";

    const adminUsername = process.env.ADMIN_LOGIN_USERNAME;
    const adminPassword = process.env.ADMIN_LOGIN_PASSWORD;
    if (adminUsername && adminPassword && matches(username, adminUsername.trim().toLowerCase()) && matches(sha256(password), sha256(adminPassword))) {
      role = "admin";
      displayName = "Admin User";
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !serviceKey) {
        return NextResponse.json({ success: false, message: "Secure login is not configured yet. Please contact the administrator." }, { status: 503 });
      }
      const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await db.from("staff").select("id, staff_id, name, username, email, role, password");
      if (error) {
        return NextResponse.json({ success: false, message: "Could not verify staff account. Check the staff table configuration." }, { status: 503 });
      }
      const found = (data ?? []).find((staff: any) => {
        const usernameMatches = [staff.name, staff.username, staff.email, staff.staff_id, staff.id]
          .some(value => String(value ?? "").trim().toLowerCase() === username);
        const stored = String(staff.password ?? "").trim();
        return usernameMatches && (matches(stored, password) || matches(stored, sha256(password)));
      });
      if (!found) return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
      const foundRole = String(found.role ?? "").trim().toLowerCase();
      role = foundRole === "admin" ? "admin" : foundRole.includes("account") ? "accountant" : foundRole.includes("online") ? "online_staff" : "staff";
      displayName = String(found.name || found.email || found.staff_id || username);
    }

    const response = NextResponse.json({ success: true, username: displayName, role });
    response.cookies.set(resumeSessionCookie.name, createResumeSessionToken(displayName, role), resumeSessionCookie);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Login request could not be processed." }, { status: 500 });
  }
}
