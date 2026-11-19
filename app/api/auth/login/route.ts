import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResumeSessionToken, resumeSessionCookie } from "@/lib/resume-auth";
import { hashPassword, isHashed, verifyHashed } from "@/lib/password";
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

// Basic brute-force protection. In-memory, so it is per server instance
// (serverless platforms may run several instances) - a first line of defence only.
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isBlocked(key: string) {
  const entry = attempts.get(key);
  return !!entry && entry.resetAt > Date.now() && entry.count >= MAX_ATTEMPTS;
}
function recordFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!username || !password || username.length > 200 || password.length > 500) {
      return NextResponse.json({ success: false, message: "Enter username and password." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limitKey = `${ip}:${username}`;
    if (isBlocked(limitKey)) {
      return NextResponse.json(
        { success: false, message: "Too many failed attempts. Please try again in a few minutes." },
        { status: 429 }
      );
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
      const { data, error } = await db.from("staff").select("id, staff_id, name, email, role, password");
      if (error) {
        return NextResponse.json({ success: false, message: "Could not verify staff account. Check the staff table configuration." }, { status: 503 });
      }
      const found = (data ?? []).find((staff: any) => {
        const usernameMatches = [staff.name, staff.username, staff.email, staff.staff_id, staff.id]
          .some(value => String(value ?? "").trim().toLowerCase() === username);
        if (!usernameMatches) return false;
        const stored = String(staff.password ?? "").trim();
        if (isHashed(stored)) return verifyHashed(password, stored);
        // Legacy rows: plain text or unsalted SHA-256. Upgraded to a salted hash below on success.
        return matches(stored, password) || matches(stored, sha256(password));
      });
      if (!found) {
        recordFailure(limitKey);
        return NextResponse.json({ success: false, message: "Invalid username or password." }, { status: 401 });
      }
      // Silently upgrade legacy passwords to a salted scrypt hash after a successful login.
      if (!isHashed(String(found.password ?? "").trim())) {
        const { error: upgradeError } = await db.from("staff").update({ password: hashPassword(password) }).eq("id", found.id);
        if (upgradeError) console.error("[login] could not upgrade password hash", upgradeError.message);
      }
      const foundRole = String(found.role ?? "").trim().toLowerCase();
      role = foundRole === "admin" ? "admin" : foundRole.includes("account") ? "accountant" : foundRole.includes("online") ? "online_staff" : "staff";
      displayName = String(found.name || found.email || found.staff_id || username);
    }

    attempts.delete(limitKey);
    const response = NextResponse.json({ success: true, username: displayName, role });
    response.cookies.set(resumeSessionCookie.name, createResumeSessionToken(displayName, role), resumeSessionCookie);
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Login request could not be processed." }, { status: 500 });
  }
}
