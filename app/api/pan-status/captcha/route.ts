import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTI_BASE = "https://www.trackpan.utiitsl.com";
const TRACK_PAGE = `${UTI_BASE}/PANONLINE/forms/TrackPan/trackApp`;
const CAPTCHA_URL = `${UTI_BASE}/PANONLINE/forms/TrackPan/captcha.jpg`;

interface PanSession {
  cookies: string;
  id: string;
  createdAt: number;
}

// Kept only in server memory. No PAN/DOB/CAPTCHA is persisted to localStorage.
const globalStore = globalThis as typeof globalThis & {
  __smartAkshayaPanSessions?: Map<string, PanSession>;
};

const sessions =
  globalStore.__smartAkshayaPanSessions ??
  (globalStore.__smartAkshayaPanSessions = new Map<string, PanSession>());

function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function mergeCookies(existing: string, response: Response): string {
  const jar = new Map<string, string>();

  const add = (line: string) => {
    const first = line.split(";")[0]?.trim() || "";
    const index = first.indexOf("=");
    if (index > 0) {
      jar.set(first.slice(0, index), first.slice(index + 1));
    }
  };

  existing.split(";").forEach(add);
  getSetCookies(response).forEach(add);

  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function extractHiddenId(html: string): string {
  const patterns = [
    /<input[^>]+name=["']id["'][^>]+value=["']([^"']+)["'][^>]*>/i,
    /<input[^>]+value=["']([^"']+)["'][^>]+name=["']id["'][^>]*>/i,
    /name=["']id["'][^>]*value=["']([^"']+)["']/i,
    /value=["']([^"']+)["'][^>]*name=["']id["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  // Some versions render the value through a JavaScript assignment.
  const jsPatterns = [
    /(?:["']id["']\s*[:=]\s*["']|\bid\s*=\s*["'])([A-Za-z0-9_-]{12,})/i,
  ];

  for (const pattern of jsPatterns) {
    const match = html.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return "";
}

function browserHeaders(extra: Record<string, string> = {}, cookies = "") {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: TRACK_PAGE,
    Origin: UTI_BASE,
    ...(cookies ? { Cookie: cookies } : {}),
    ...extra,
  };
}

function cleanupExpired() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [key, value] of sessions) {
    if (value.createdAt < cutoff) sessions.delete(key);
  }
}

export async function GET() {
  cleanupExpired();

  try {
    const pageResponse = await fetch(TRACK_PAGE, {
      method: "GET",
      headers: browserHeaders(),
      cache: "no-store",
      redirect: "follow",
    });

    if (!pageResponse.ok) {
      return NextResponse.json(
        { success: false, error: `UTIITSL tracking page returned ${pageResponse.status}.` },
        { status: 502 }
      );
    }

    const html = await pageResponse.text();
    let cookies = mergeCookies("", pageResponse);
    const id = extractHiddenId(html);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "UTIITSL dynamic session ID was not received." },
        { status: 502 }
      );
    }

    const captchaResponse = await fetch(CAPTCHA_URL, {
      method: "GET",
      headers: browserHeaders(
        {
          Accept: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
        },
        cookies
      ),
      cache: "no-store",
      redirect: "follow",
    });

    cookies = mergeCookies(cookies, captchaResponse);

    if (!captchaResponse.ok) {
      return NextResponse.json(
        { success: false, error: `UTIITSL CAPTCHA returned ${captchaResponse.status}.` },
        { status: 502 }
      );
    }

    const contentType = captchaResponse.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await captchaResponse.arrayBuffer());

    if (!bytes.length) {
      return NextResponse.json(
        { success: false, error: "UTIITSL CAPTCHA image was empty." },
        { status: 502 }
      );
    }

    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, {
      cookies,
      id,
      createdAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      sessionId,
      captchaDataUrl: `data:${contentType};base64,${bytes.toString("base64")}`,
    });
  } catch (error) {
    console.error("PAN CAPTCHA error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Unable to load UTIITSL CAPTCHA." },
      { status: 502 }
    );
  }
}
