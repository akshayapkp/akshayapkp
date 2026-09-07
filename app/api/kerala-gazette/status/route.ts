import { NextResponse } from "next/server";

const COMPOSE_ORIGIN = "https://compose.kerala.gov.in";
const TRACKING_PAGE = "/citizengazttracking";

type SearchType = "applicationNumber" | "mobileNumber" | "name";

type GazetteResult = {
  applicationNumber: string;
  applicantName: string;
  applicationDate: string;
  applicationType: string;
  internalId: string;
  status: string;
  gazetteNumber: string;
  gazetteYear: string;
};

function getSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function buildCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function tokenify(number: number): string {
  const charmap =
    "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*$";

  const tokenbuf: string[] = [];
  let remainder = Math.floor(number);

  while (remainder > 0) {
    tokenbuf.push(charmap.charAt(remainder & 0x3f));
    remainder = Math.floor(remainder / 64);
  }

  return tokenbuf.join("");
}

function createPageId(): string {
  return (
    tokenify(Date.now()) +
    "-" +
    tokenify(Math.floor(Math.random() * 1e16))
  );
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function extractCallbackPayload(text: string): unknown {
  const marker = "handleCallback(";
  const markerIndex = text.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error("DWR callback was not found.");
  }

  // Find the start of the 3rd callback argument.
  let commaCount = 0;
  let payloadStart = -1;
  let inString = false;
  let escaped = false;

  for (let i = markerIndex + marker.length; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === ",") {
      commaCount++;
      if (commaCount === 2) {
        payloadStart = i + 1;
        break;
      }
    }
  }

  if (payloadStart === -1) {
    throw new Error("DWR callback payload was not found.");
  }

  while (
    payloadStart < text.length &&
    /\s/.test(text[payloadStart])
  ) {
    payloadStart++;
  }

  if (payloadStart >= text.length) {
    return null;
  }

  const first = text[payloadStart];

  // DWR can return null/undefined for an application that does not exist.
  if (text.startsWith("null", payloadStart)) {
    return null;
  }

  if (text.startsWith("undefined", payloadStart)) {
    return null;
  }

  // Quoted string payload, e.g. generateId.
  if (first === '"') {
    let escapedString = false;

    for (let i = payloadStart + 1; i < text.length; i++) {
      const ch = text[i];

      if (escapedString) {
        escapedString = false;
        continue;
      }

      if (ch === "\\") {
        escapedString = true;
        continue;
      }

      if (ch === '"') {
        const jsonText = text.slice(payloadStart, i + 1);
        return JSON.parse(jsonText);
      }
    }

    throw new Error("Incomplete DWR string payload.");
  }

  // Parse arrays/objects without assuming the payload starts with [[.
  // Gazette lookup normally returns [[...]], while some DWR responses
  // can return [] or a single-level array.
  if (first === "[" || first === "{") {
    const opening = first;
    const closing = first === "[" ? "]" : "}";
    let depth = 0;
    let inJsonString = false;
    let escapedJsonString = false;

    for (let i = payloadStart; i < text.length; i++) {
      const ch = text[i];

      if (inJsonString) {
        if (escapedJsonString) {
          escapedJsonString = false;
        } else if (ch === "\\") {
          escapedJsonString = true;
        } else if (ch === '"') {
          inJsonString = false;
        }
        continue;
      }

      if (ch === '"') {
        inJsonString = true;
        continue;
      }

      if (ch === opening) {
        depth++;
      } else if (ch === closing) {
        depth--;

        if (depth === 0) {
          const jsonText = text.slice(payloadStart, i + 1);
          return JSON.parse(jsonText);
        }
      }
    }

    throw new Error("Incomplete DWR structured payload.");
  }

  // Numeric / boolean primitive fallback.
  const primitive = text
    .slice(payloadStart)
    .match(/^(true|false|-?\d+(?:\.\d+)?)/);

  if (primitive) {
    if (primitive[1] === "true") return true;
    if (primitive[1] === "false") return false;
    return Number(primitive[1]);
  }

  // Empty quoted-like payload or an unrecognised empty response should be
  // treated as "not found", not as a server/parser failure.
  const remainder = text.slice(payloadStart).trim();
  if (!remainder || remainder === '""') {
    return "";
  }

  throw new Error("Unable to parse DWR callback payload.");
}
function extractGenerateId(responseText: string): string {
  const payload = extractCallbackPayload(responseText);
  const id = clean(payload);

  if (!id) {
    throw new Error("Kerala COMPOSE did not return a DWR session ID.");
  }

  return id;
}

function extractGazetteRows(responseText: string): unknown[][] {
  const payload = extractCallbackPayload(responseText);

  if (payload == null || payload === "") {
    return [];
  }

  if (!Array.isArray(payload)) {
    return [];
  }

  if (payload.length === 0) {
    return [];
  }

  if (Array.isArray(payload[0])) {
    return payload as unknown[][];
  }

  return [payload];
}

function createDwrBody(params: {
  batchId: string;
  instanceId: string;
  page: string;
  scriptSessionId: string;
  scriptName: string;
  methodName: string;
  callId: string;
  params?: (string | number)[];
}): string {
  const lines = [
    "callCount=1",
    "windowName=",
    `c0-scriptName=${params.scriptName}`,
    `c0-methodName=${params.methodName}`,
    `c0-id=${params.callId}`,
  ];

  (params.params ?? []).forEach((param, index) => {
    const paramType = typeof param === "number" ? "number" : "string";
    lines.push(
      `c0-param${index}=${paramType}:${encodeURIComponent(String(param))}`
    );
  });

  lines.push(
    `batchId=${params.batchId}`,
    `instanceId=${params.instanceId}`,
    `page=${encodeURIComponent(params.page)}`,
    `scriptSessionId=${encodeURIComponent(params.scriptSessionId)}`
  );

  return lines.join("\n") + "\n";
}

function rowToResult(row: unknown[]): GazetteResult {
  return {
    applicationNumber: clean(row[0]),
    applicantName: clean(row[1]),
    applicationDate: clean(row[2]),
    applicationType: clean(row[3]),
    internalId: clean(row[4]),
    status: clean(row[6] ?? row[5]),
    gazetteNumber: "",
    gazetteYear: "",
  };
}

async function getGazetteNumber(
  internalId: string,
  scriptSessionId: string,
  cookieHeader: string
): Promise<{ gazetteNumber: string; gazetteYear: string }> {
  // Official COMPOSE tracking page calls this exact DWR method with
  // the application's internalId as a NUMBER parameter.
  const methodName = "getgazettenoforclr";
  const numericInternalId = Number(internalId);

  if (!Number.isFinite(numericInternalId)) {
    return { gazetteNumber: "", gazetteYear: "" };
  }

  const body = createDwrBody({
    batchId: "2",
    instanceId: "0",
    page: TRACKING_PAGE,
    scriptSessionId,
    scriptName: "masterDAO",
    methodName,
    callId: "0",
    params: [numericInternalId],
  });

  const response = await fetch(
    `${COMPOSE_ORIGIN}/dwr/call/plaincall/masterDAO.${methodName}.dwr`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain",
        Accept: "*/*",
        Referer: `${COMPOSE_ORIGIN}${TRACKING_PAGE}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body,
    }
  );

  if (!response.ok) {
    return { gazetteNumber: "", gazetteYear: "" };
  }

  const text = await response.text();

  // Official response observed from COMPOSE:
  // r.handleCallback("4","0",[[48,new Date(1701109800000),"2023"]]);
  const match = text.match(
    /\[\[\s*(\d+)\s*,\s*new Date\(\d+\)\s*,\s*["']([^"']+)["']\s*\]\]/
  );

  if (!match) {
    return { gazetteNumber: "", gazetteYear: "" };
  }

  return {
    gazetteNumber: clean(match[1]),
    gazetteYear: clean(match[2]),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const searchType = clean(body?.searchType) as SearchType;
    const searchValue = clean(body?.searchValue);

    if (
      searchType !== "applicationNumber" &&
      searchType !== "mobileNumber" &&
      searchType !== "name"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please select a valid search option.",
        },
        { status: 400 }
      );
    }

    let value = searchValue;

    if (searchType === "applicationNumber") {
      value = value.replace(/\D/g, "");

      if (!value) {
        return NextResponse.json(
          {
            success: false,
            error: "Please enter a valid Application Number.",
          },
          { status: 400 }
        );
      }
    }

    if (searchType === "mobileNumber") {
      value = value.replace(/\D/g, "");

      if (!value) {
        return NextResponse.json(
          {
            success: false,
            error: "Please enter a valid Mobile Number.",
          },
          { status: 400 }
        );
      }
    }

    if (searchType === "name" && !value) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid Name.",
        },
        { status: 400 }
      );
    }

    /*
     * Start a fresh COMPOSE session.
     * The tracking page sets the JSESSIONID used by the DWR calls.
     */
    const pageResponse = await fetch(
      `${COMPOSE_ORIGIN}${TRACKING_PAGE}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
        },
      }
    );

    const setCookies = getSetCookieHeaders(pageResponse);
    const cookieHeader = buildCookieHeader(setCookies);

    if (!pageResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Unable to open Kerala COMPOSE tracking page (HTTP ${pageResponse.status}).`,
        },
        { status: 502 }
      );
    }

    const pageId = createPageId();

    /*
     * DWR first creates a DWRSESSIONID through __System.generateId.
     */
    const generateBody = createDwrBody({
      batchId: "0",
      instanceId: "0",
      page: TRACKING_PAGE,
      scriptSessionId: "",
      scriptName: "__System",
      methodName: "generateId",
      callId: "0",
    });

    const generateResponse = await fetch(
      `${COMPOSE_ORIGIN}/dwr/call/plaincall/__System.generateId.dwr`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain",
          Accept: "*/*",
          Referer: `${COMPOSE_ORIGIN}${TRACKING_PAGE}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: generateBody,
      }
    );

    const generateText = await generateResponse.text();

    if (!generateResponse.ok) {
      console.error(
        "DWR generateId failed:",
        generateResponse.status,
        generateText
      );

      return NextResponse.json(
        {
          success: false,
          error: `Kerala COMPOSE DWR session request failed (HTTP ${generateResponse.status}).`,
        },
        { status: 502 }
      );
    }

    const dwrSessionId = extractGenerateId(generateText);
    const scriptSessionId = `${dwrSessionId}/${pageId}`;

    let methodName: string;
    let methodParams: string[];

    if (searchType === "applicationNumber") {
      methodName = "getCitizenServiceNoSearch";
      methodParams = [value];
    } else if (searchType === "mobileNumber") {
      methodName = "getCitizenServiceMobileNoSearch";
      methodParams = [value];
    } else {
      methodName = "getCitizenServiceNameSearch";
      methodParams = [value, "10", "2"];
    }

    const endpoint =
      `/dwr/call/plaincall/masterDAO.${methodName}.dwr`;

    const lookupBody = createDwrBody({
      batchId: "1",
      instanceId: "0",
      page: TRACKING_PAGE,
      scriptSessionId,
      scriptName: "masterDAO",
      methodName,
      callId: "0",
      params: methodParams,
    });

    const lookupResponse = await fetch(
      `${COMPOSE_ORIGIN}${endpoint}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "text/plain",
          Accept: "*/*",
          Referer: `${COMPOSE_ORIGIN}${TRACKING_PAGE}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: lookupBody,
      }
    );

    const lookupText = await lookupResponse.text();

    if (!lookupResponse.ok) {
      console.error(
        "Gazette lookup failed:",
        lookupResponse.status,
        lookupText
      );

      return NextResponse.json(
        {
          success: false,
          error: `Kerala COMPOSE returned HTTP ${lookupResponse.status}.`,
        },
        { status: 502 }
      );
    }

    const rows = extractGazetteRows(lookupText);

    let results = rows
      .map(rowToResult)
      .filter(
        (result) =>
          result.applicationNumber ||
          result.applicantName ||
          result.applicationDate ||
          result.status
      );

    if (searchType === "applicationNumber") {
      results = results.filter(
        (result) =>
          result.applicationNumber.trim() === value &&
          Boolean(result.internalId.trim())
      );
    }

    results = results.filter((result) => Boolean(result.status.trim()));

    for (const result of results) {
      if (result.applicationNumber) {
        try {
          const gazette = await getGazetteNumber(
            result.internalId,
            scriptSessionId,
            cookieHeader
          );
          result.gazetteNumber = gazette.gazetteNumber;
          result.gazetteYear = gazette.gazetteYear;
        } catch (gazetteError) {
          console.error("Gazette number lookup failed:", gazetteError);
        }
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No application was found for ${value}.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      data: results[0],
      searchType,
      searchValue: value,
    });
  } catch (error) {
    console.error("Kerala Gazette tracker error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch Kerala Gazette status.",
      },
      { status: 500 }
    );
  }
}
