import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export type ResumeSession = { username: string; role: string; exp: number };

const COOKIE_NAME = "akshaya_resume_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.RESUME_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("RESUME_SESSION_SECRET must be set to a random value of at least 32 characters.");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createResumeSessionToken(username: string, role: string) {
  const payload = Buffer.from(JSON.stringify({
    username,
    role,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  })).toString("base64url");
  return payload + "." + sign(payload);
}

export function verifyResumeSessionToken(token: string | undefined): ResumeSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ResumeSession;
    if (!session.username || !session.role || !session.exp || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getResumeSession(): Promise<ResumeSession | null> {
  const jar = await cookies();
  return verifyResumeSessionToken(jar.get(COOKIE_NAME)?.value);
}

export const resumeSessionCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
