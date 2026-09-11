import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTI_BASE = "https://www.trackpan.utiitsl.com";
const TRACK_PAGE = `${UTI_BASE}/PANONLINE/forms/TrackPan/trackApp`;
const GET_DATA_URL = `${UTI_BASE}/PANONLINE/forms/TrackPan/getData`;

interface PanSession {
  cookies: string;
  id: string;
  createdAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __smartAkshayaPanSessions?: Map<string, PanSession>;
};

const sessions =
  globalStore.__smartAkshayaPanSessions ??
  (globalStore.__smartAkshayaPanSessions = new Map<string, PanSession>());

function getSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function mergeCookies(existing: string, response: Response): string {
  const jar = new Map<string, string>();
  const add = (line: string) => {
    const first = line.split(";")[0]?.trim() || "";
    const index = first.indexOf("=");
    if (index > 0) jar.set(first.slice(0, index), first.slice(index + 1));
  };
  existing.split(";").forEach(add);
  getSetCookies(response).forEach(add);
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function cleanHtml(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabel(value: string): string {
  return cleanHtml(value).replace(/\s+/g, " ").trim().toLowerCase().replace(/[:.]+$/, "");
}

function extractTableValue(html: string, labels: string[]): string {
  const lowerLabels = labels.map((label) => normalizeLabel(label));
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html))) {
    const cells = [...rowMatch[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((match) => cleanHtml(match[1]));

    for (let i = 0; i < cells.length; i++) {
      const label = normalizeLabel(cells[i]);
      if (lowerLabels.some((candidate) => label === candidate || label.includes(candidate))) {
        const value = cells[i + 1] || "";
        if (value) return value;
      }
    }
  }

  return "";
}

function extractTextValue(text: string, labels: string[]): string {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`${escaped}\\s*[:\\-]?\\s*([^|]{2,250})`, "i"),
      new RegExp(`${escaped}\\s+([^]{2,250})`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = match[1].split(/\b(?:Application Coupon number|Application Type|Applicant Name|Status|Region)\b/i)[0].trim();
        if (value) return value;
      }
    }
  }
  return "";
}

function parseResult(html: string, searchType: "pan" | "coupon", searchValue: string) {
  const text = cleanHtml(html);

  const couponNumber = extractTableValue(html, [
    "Application Coupon number",
    "Application Coupon Number",
    "Coupon Number",
    "Coupon No",
  ]) || extractTextValue(text, ["Application Coupon number", "Application Coupon Number", "Coupon Number", "Coupon No"]);

  const applicationType = extractTableValue(html, ["Application Type", "Application type"])
    || extractTextValue(text, ["Application Type", "Application type"]);

  const applicantName = extractTableValue(html, ["Applicant Name", "Applicant name", "Name"])
    || extractTextValue(text, ["Applicant Name", "Applicant name"]);

  let status = extractTableValue(html, ["Status", "Application Status", "Application status"])
    || extractTextValue(text, ["Status", "Application Status", "Application status"]);

  const region = extractTableValue(html, ["Region"])
    || extractTextValue(text, ["Region"]);

  if (!status) {
    const statusSentence = text.match(/YOUR APPLICATION IS[\s\S]{0,500}/i);
    if (statusSentence?.[0]) status = statusSentence[0].trim();
  }

  // Error/not-found messages should not be presented as a successful record.
  const noRecord = /(no record|record not found|invalid|does not exist|not available|wrong captcha|captcha.*invalid)/i.test(text);

  return {
    searchType,
    searchValue,
    couponNumber,
    applicationType,
    applicantName,
    status,
    region,
    found: !noRecord && Boolean(status || couponNumber || applicantName),
  };
}

function browserHeaders(cookies: string) {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Content-Type": "application/x-www-form-urlencoded",
    Referer: TRACK_PAGE,
    Origin: UTI_BASE,
    ...(cookies ? { Cookie: cookies } : {}),
    "Upgrade-Insecure-Requests": "1",
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const searchType = body?.searchType === "coupon" ? "coupon" : "pan";
    const searchValue = String(body?.searchValue ?? "").trim();
    const dob = String(body?.dob ?? "").trim();
    const captcha = String(body?.captcha ?? "").trim();
    const sessionId = String(body?.sessionId ?? "").trim();

    if (!sessionId || !sessions.has(sessionId)) {
      return NextResponse.json(
        { success: false, error: "PAN session expired. Please refresh the CAPTCHA and try again." },
        { status: 400 }
      );
    }

    if (!searchValue) {
      return NextResponse.json({ success: false, error: `Please enter a ${searchType === "pan" ? "PAN number" : "coupon number"}.` }, { status: 400 });
    }

    if (searchType === "pan" && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(searchValue.replace(/\s+/g, "").toUpperCase())) {
      return NextResponse.json({ success: false, error: "Please enter a valid PAN number (e.g. ABCDE1234F)." }, { status: 400 });
    }

    if (searchType === "coupon" && !/^[A-Za-z0-9-]{6,30}$/.test(searchValue)) {
      return NextResponse.json({ success: false, error: "Please enter a valid coupon number." }, { status: 400 });
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      return NextResponse.json({ success: false, error: "Date of Birth must be in DD/MM/YYYY format." }, { status: 400 });
    }

    if (!captcha) {
      return NextResponse.json({ success: false, error: "Please enter the CAPTCHA." }, { status: 400 });
    }

    const session = sessions.get(sessionId)!;
    let cookies = session.cookies;

    const form = new URLSearchParams();
    if (searchType === "pan") {
      form.set("panno", searchValue.replace(/\s+/g, "").toUpperCase());
    } else {
      form.set("couponno", searchValue);
    }
    form.set("dob", dob);
    form.set("captcha", captcha);
    form.set("id", session.id);

    const response = await fetch(GET_DATA_URL, {
      method: "POST",
      headers: browserHeaders(cookies),
      body: form.toString(),
      cache: "no-store",
      redirect: "follow",
    });

    cookies = mergeCookies(cookies, response);
    session.cookies = cookies;
    session.createdAt = Date.now();

    const html = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `UTIITSL status service returned ${response.status}.` },
        { status: 502 }
      );
    }

    const result = parseResult(html, searchType, searchValue);

    if (!result.found) {
      return NextResponse.json({
        success: false,
        error: "No PAN application was found. Please verify the number, date of birth and CAPTCHA.",
      }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PAN status error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: "Unable to fetch UTIITSL PAN status." },
      { status: 502 }
    );
  }
}
