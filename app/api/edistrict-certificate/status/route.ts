import { NextResponse } from "next/server";

const EDISTRICT_ORIGIN = "https://edistrict.kerala.gov.in";
const SEARCH_URL = `${EDISTRICT_ORIGIN}/openSearch.do`;
const SEARCH_PAGE_URL = `${EDISTRICT_ORIGIN}/openSearch.do?openStat=openSearch&lang=en`;

export const runtime = "nodejs";

const CERTIFICATE_CODES: Record<string, string> = {
  "2": "Caste",
  "1": "Community",
  "11": "Domicile",
  "22": "Family Membership",
  "4": "Income",
  "10": "Legal Heir",
  "93": "Minority",
  "6": "Nativity",
  "36": "Non-Creamy Layer",
  "25": "Non-ReMarriage",
  "26": "One and the Same",
  "13": "Possession",
  "27": "Possession and Non-Attachment",
  "8": "Relationship",
};

function extractSetCookies(response: Response): string {
  const raw = response.headers.get("set-cookie");
  if (!raw) return "";

  const jar = new Map<string, string>();

  // Split multiple Set-Cookie values without using Headers.getSetCookie(),
  // because some Node/Next.js combinations throw "Illegal invocation".
  const parts = raw.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);

  for (const part of parts) {
    const first = part.trim().split(";")[0];
    const index = first.indexOf("=");
    if (index <= 0) continue;

    const name = first.slice(0, index).trim();
    const value = first.slice(index + 1).trim();

    if (name) jar.set(name, value);
  }

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function addCookies(existing: string, response: Response): string {
  const fresh = extractSetCookies(response);
  if (!fresh) return existing;

  const jar = new Map<string, string>();

  for (const item of existing.split(";")) {
    const trimmed = item.trim();
    const index = trimmed.indexOf("=");

    if (index > 0) {
      jar.set(trimmed.slice(0, index), trimmed.slice(index + 1));
    }
  }

  for (const item of fresh.split(";")) {
    const trimmed = item.trim();
    const index = trimmed.indexOf("=");

    if (index > 0) {
      jar.set(trimmed.slice(0, index), trimmed.slice(index + 1));
    }
  }

  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanValue(value: string, fallback = ""): string {
  const cleaned = decodeHtml(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

  return cleaned || fallback;
}

/**
 * The official response has a very clear structure:
 *
 * <label ...>Application No</label>
 * <span ...>114488565</span>
 *
 * <label ...>Applicant Name</label>
 * <span ...>AJAL KRISHNA C P</span>
 *
 * etc.
 *
 * So we parse the VALUE SPAN immediately after the matching English label.
 * This avoids the previous generic text parser which was picking up
 * Malayalam labels / unrelated page text.
 */
function findValueAfterLabel(html: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    `<label[^>]*>\\s*${escapedLabel}\\s*<\\/label>` +
      `(?:\\s*<label[^>]*>[\\s\\S]*?<\\/label>)*` +
      `\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`,
    "i"
  );

  const match = html.match(pattern);

  if (match?.[1]) {
    return cleanValue(match[1]);
  }

  // Fallback for table-based responses:
  // <td>Application No</td><td>...</td>
  const tablePattern = new RegExp(
    `<(?:td|th)[^>]*>\\s*${escapedLabel}\\s*<\\/(?:td|th)>` +
      `(?:\\s*<(?:td|th)[^>]*>[\\s\\S]*?<\\/(?:td|th)>)*` +
      `\\s*<(?:td|th)[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`,
    "i"
  );

  const tableMatch = html.match(tablePattern);

  if (tableMatch?.[1]) {
    return cleanValue(tableMatch[1]);
  }

  return "";
}

function findDetailValue(html: string, labels: string[]): string {
  for (const label of labels) {
    const value = findValueAfterLabel(html, label);
    if (value) return value;
  }

  return "";
}

function parseResult(
  html: string,
  requestedApplicationNumber: string,
  selectedCertificate: string
) {
  // IMPORTANT: never fall back to the user's requested application number.
  // The official response must contain real application details; otherwise an
  // invalid number can incorrectly appear as a successful "status available".
  const applicationNumber = findDetailValue(html, [
    "Application No",
    "Application Number",
  ]);

  const applicantName = findDetailValue(html, [
    "Applicant Name",
    "Applicant",
    "Name of Applicant",
  ]);

  const serviceName = findDetailValue(html, [
    "Service Name",
    "Certificate Type",
    "Service",
  ]);

  const office = findDetailValue(html, [
    "Office",
    "Office Name",
    "Village Office",
    "Taluk Office",
  ]);

  const status = findDetailValue(html, [
    "Application Status",
    "Current Status",
    "Status",
  ]);

  const pageText = cleanValue(html);

  const noResult =
    /no\s+(record|application|data)\s+(found|available)/i.test(pageText) ||
    /invalid\s+application/i.test(pageText) ||
    /application\s+not\s+found/i.test(pageText) ||
    /this\s+application\s+(does\s+not\s+exist|not\s+exist)/i.test(pageText);

  const hasDetails =
    /Application Details/i.test(html) &&
    /Applicant Name/i.test(html) &&
    /Application Status/i.test(html) &&
    Boolean(applicationNumber);

  if (noResult || !hasDetails) {
    return null;
  }

  // Protect against a response belonging to a different application.
  if (applicationNumber.trim() !== requestedApplicationNumber.trim()) {
    return null;
  }

  if (!status.trim()) {
    return null;
  }

  return {
    applicationNumber: applicationNumber.trim(),
    applicantName: cleanValue(applicantName, "—"),
    serviceName: cleanValue(serviceName, selectedCertificate),
    office: cleanValue(office, "—"),
    status: status.trim(),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const applicationNumber = String(
      body?.applicationNumber ?? ""
    ).trim();

    const serviceCode = String(body?.serviceCode ?? "").trim();

    if (!applicationNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Application number is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(applicationNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid numeric application number.",
        },
        { status: 400 }
      );
    }

    const selectedCertificate = CERTIFICATE_CODES[serviceCode];

    if (!selectedCertificate) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid certificate type.",
        },
        { status: 400 }
      );
    }

    let cookies = "";

    // 1. Open the official search page first to establish the session.
    const initialPage = await fetch(SEARCH_PAGE_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });

    cookies = addCookies(cookies, initialPage);

    // 2. Submit exactly the same public-search form used by the
    // official e-District page.
    const form = new URLSearchParams({
      searchService: "publicSearch",
      applNo: applicationNumber,
      serviceCode,
      hiddenval: "",
      hiddenServiceType: "RC",
      srvceType: "",
      scode: "",
      applicationNo: "",
      token: "",
      ctypecheck: "",
    });

    const searchResponse = await fetch(SEARCH_URL, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: EDISTRICT_ORIGIN,
        Referer: SEARCH_URL,
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: form.toString(),
      cache: "no-store",
      redirect: "manual",
    });

    cookies = addCookies(cookies, searchResponse);

    let html = await searchResponse.text();

    // Some deployments redirect after POST. Follow the redirect using
    // the same session cookies.
    const location = searchResponse.headers.get("location");

    if (location) {
      const redirectUrl = new URL(
        location,
        EDISTRICT_ORIGIN
      ).toString();

      const redirected = await fetch(redirectUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...(cookies ? { Cookie: cookies } : {}),
        },
        cache: "no-store",
      });

      cookies = addCookies(cookies, redirected);
      html = await redirected.text();
    }

    if (!html) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The e-District server returned an empty response.",
        },
        { status: 502 }
      );
    }

    const data = parseResult(
      html,
      applicationNumber,
      selectedCertificate
    );

    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
        error: `No application was found for ${applicationNumber}.`,
        searchType: "applicationNumber",
        searchValue: applicationNumber,
      });
    }

    return NextResponse.json({
      success: true,
      data,
      searchType: "applicationNumber",
      searchValue: applicationNumber,
    });
  } catch (error) {
    console.error("e-District status error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to connect to Kerala e-District.",
      },
      { status: 502 }
    );
  }
}
