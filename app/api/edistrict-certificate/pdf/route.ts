import { NextResponse } from "next/server";

const ORIGIN = "https://edistrict.kerala.gov.in";
const SEARCH_PAGE_URL = `${ORIGIN}/openSearch.do?openStat=openSearch&lang=en`;
const SEARCH_URL = `${ORIGIN}/openSearch.do`;
const PDF_URL = `${ORIGIN}/openSearch.pdf`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0";

function cookiesFromResponse(response: Response): string {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  let values: string[] = [];
  if (typeof headers.getSetCookie === "function") {
    try {
      values = headers.getSetCookie();
    } catch {
      values = [];
    }
  }

  if (!values.length) {
    const raw = response.headers.get("set-cookie");
    if (raw) values = [raw];
  }

  const jar = new Map<string, string>();

  for (const value of values) {
    // Node may expose several Set-Cookie values as one comma-separated value.
    const parts = value.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);
    for (const part of parts) {
      const first = part.trim().split(";")[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
    }
  }

  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function mergeCookies(current: string, response: Response): string {
  const jar = new Map<string, string>();

  for (const item of current.split(";")) {
    const trimmed = item.trim();
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }

  const fresh = cookiesFromResponse(response);
  for (const item of fresh.split(";")) {
    const trimmed = item.trim();
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }

  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function browserHeaders(cookies: string, extra: Record<string, string> = {}) {
  return {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...extra,
    ...(cookies ? { Cookie: cookies } : {}),
  };
}

async function getWithSession(
  url: string,
  cookies: string,
  referer: string
): Promise<{ response: Response; cookies: string; url: string }> {
  let currentUrl = url;
  let currentCookies = cookies;

  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(currentUrl, {
      method: "GET",
      headers: browserHeaders(currentCookies, { Referer: referer }),
      cache: "no-store",
      redirect: "manual",
    });

    currentCookies = mergeCookies(currentCookies, response);

    if (response.status < 300 || response.status >= 400) {
      return { response, cookies: currentCookies, url: currentUrl };
    }

    const location = response.headers.get("location");
    if (!location) {
      return { response, cookies: currentCookies, url: currentUrl };
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error("Too many redirects from Kerala e-District.");
}

function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

function looksLikePdfContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes("application/pdf");
}


function tokenify(number: number): string {
  const charmap = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*$";
  const tokenbuf: string[] = [];
  let remainder = Math.floor(number);
  while (remainder > 0) {
    tokenbuf.push(charmap.charAt(remainder & 0x3f));
    remainder = Math.floor(remainder / 64);
  }
  return tokenbuf.join("");
}

function createPageId(): string {
  return `${tokenify(Date.now())}-${tokenify(Math.floor(Math.random() * 1e16))}`;
}

function extractDwrCallbackPayload(text: string): unknown {
  const marker = "handleCallback(";
  const start = text.indexOf(marker);
  if (start < 0) throw new Error("DWR callback was not found.");

  let commas = 0;
  let payloadStart = -1;
  for (let i = start + marker.length; i < text.length; i++) {
    if (text[i] === ",") {
      commas++;
      if (commas === 2) {
        payloadStart = i + 1;
        break;
      }
    }
  }
  if (payloadStart < 0) throw new Error("DWR callback payload was not found.");
  while (payloadStart < text.length && /\s/.test(text[payloadStart])) payloadStart++;

  const rest = text.slice(payloadStart);
  const quoted = rest.match(/^\"((?:\\.|[^\"\\])*)\"/);
  if (quoted) return JSON.parse(`"${quoted[1]}"`);

  const arrayStart = rest.indexOf("[");
  if (arrayStart >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = arrayStart; i < rest.length; i++) {
      const ch = rest[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === "\"") inString = false;
        continue;
      }
      if (ch === "\"") { inString = true; continue; }
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) return JSON.parse(rest.slice(arrayStart, i + 1));
      }
    }
  }

  throw new Error("Unable to parse DWR callback payload.");
}

function createDwrBody(params: {
  batchId: string;
  instanceId: string;
  page: string;
  scriptSessionId: string;
  scriptName: string;
  methodName: string;
  callId: string;
  params?: string[];
}): string {
  const lines = [
    "callCount=1",
    "windowName=",
    `c0-scriptName=${params.scriptName}`,
    `c0-methodName=${params.methodName}`,
    `c0-id=${params.callId}`,
  ];
  (params.params ?? []).forEach((value, index) => {
    lines.push(`c0-param${index}=string:${encodeURIComponent(value)}`);
  });
  lines.push(
    `batchId=${params.batchId}`,
    `instanceId=${params.instanceId}`,
    `page=${encodeURIComponent(params.page)}`,
    `scriptSessionId=${encodeURIComponent(params.scriptSessionId)}`
  );
  return lines.join("\n") + "\n";
}

function fileName(applicationNumber: string) {
  return `edistrict-${applicationNumber}.pdf`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const applicationNumber = String(body?.applicationNumber ?? "").trim();
    const serviceCode = String(body?.serviceCode ?? "").trim();

    if (!/^\d+$/.test(applicationNumber)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid application number." },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(serviceCode)) {
      return NextResponse.json(
        { success: false, error: "A valid certificate type is required." },
        { status: 400 }
      );
    }

    let cookies = "";

    // ------------------------------------------------------------
    // 1. Start a fresh official e-District browser session.
    // ------------------------------------------------------------
    const initial = await getWithSession(
      SEARCH_PAGE_URL,
      "",
      ORIGIN + "/"
    );
    cookies = initial.cookies;

    // ------------------------------------------------------------
    // 2. Initialize the same DWR session used by the official page.
    //    The official browser carries a DWRSESSIONID alongside JSESSIONID;
    //    openSearch.pdf may require that session state even though the
    //    public status POST itself can work without it.
    // ------------------------------------------------------------
    const pageId = createPageId();
    const generateBody = createDwrBody({
      batchId: "0",
      instanceId: "0",
      page: "/openSearch.do",
      scriptSessionId: "",
      scriptName: "__System",
      methodName: "generateId",
      callId: "0",
    });

    const generateResponse = await fetch(
      `${ORIGIN}/dwr/call/plaincall/__System.generateId.dwr`,
      {
        method: "POST",
        headers: browserHeaders(cookies, {
          "Content-Type": "text/plain",
          Accept: "*/*",
          Referer: SEARCH_PAGE_URL,
        }),
        body: generateBody,
        cache: "no-store",
      }
    );

    const generateText = await generateResponse.text();
    if (!generateResponse.ok) {
      throw new Error(`e-District DWR session initialization failed (${generateResponse.status}).`);
    }

    const dwrPayload = extractDwrCallbackPayload(generateText);
    const dwrSessionId = String(dwrPayload ?? "").trim();
    if (!dwrSessionId) throw new Error("e-District did not return a DWR session ID.");

    // Keep the official DWR cookie in the same jar as JSESSIONID.
    cookies = mergeCookies(
      `${cookies}${cookies ? "; " : ""}DWRSESSIONID=${dwrSessionId}`,
      generateResponse
    );

    // Mimic the first DWR call made by the official e-District page.
    // This establishes the same DWR page/session context used by the
    // certificate selector before the status search is submitted.
    const scriptSessionId = `${dwrSessionId}/${pageId}`;
    const certificatesBody = createDwrBody({
      batchId: "1",
      instanceId: "0",
      page: "/openSearch.do",
      scriptSessionId,
      scriptName: "organizationDAO",
      methodName: "getAllCertificates",
      callId: "0",
    });

    const certificatesResponse = await fetch(
      `${ORIGIN}/dwr/call/plaincall/organizationDAO.getAllCertificates.dwr`,
      {
        method: "POST",
        headers: browserHeaders(cookies, {
          "Content-Type": "text/plain",
          Accept: "*/*",
          Referer: SEARCH_PAGE_URL,
        }),
        body: certificatesBody,
        cache: "no-store",
      }
    );
    const certificatesText = await certificatesResponse.text();
    if (!certificatesResponse.ok) {
      throw new Error(`e-District certificate session request failed (${certificatesResponse.status}).`);
    }

    // ------------------------------------------------------------
    // 3. Perform the SAME public search that the official page does.
    //    This is important because openSearch.pdf uses the server-side
    //    state created by this search.
    // ------------------------------------------------------------
    const form = new URLSearchParams();
    form.append("searchService", "publicSearch");
    form.append("applNo", applicationNumber);
    form.append("serviceCode", serviceCode);
    form.append("hiddenval", "");
    form.append("hiddenServiceType", "RC");
    form.append("srvceType", "");
    form.append("scode", "");
    form.append("applicationNo", "");
    form.append("token", "");
    form.append("ctypecheck", "");

    const searchResponse = await fetch(SEARCH_URL, {
      method: "POST",
      headers: browserHeaders(cookies, {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: ORIGIN,
        Referer: SEARCH_PAGE_URL,
        "Upgrade-Insecure-Requests": "1",
      }),
      body: form.toString(),
      cache: "no-store",
      redirect: "manual",
    });

    cookies = mergeCookies(cookies, searchResponse);

    // Read the response body even when we only need the session. Some
    // servlet containers finish/commit session state while producing it.
    let searchHtml = await searchResponse.text();

    // Follow any redirect while keeping the exact same cookie jar.
    if (searchResponse.status >= 300 && searchResponse.status < 400) {
      const location = searchResponse.headers.get("location");
      if (location) {
        const redirected = await getWithSession(
          new URL(location, SEARCH_URL).toString(),
          cookies,
          SEARCH_URL
        );
        cookies = redirected.cookies;
        searchHtml = await redirected.response.text();
      }
    }

    if (!searchHtml) {
      throw new Error("Kerala e-District returned an empty search response.");
    }

    // ------------------------------------------------------------
    // 4. Submit the SAME print form used by the official e-District page.
    //    The official page submits POST /openSearch.pdf with
    //    searchService=qrPrint. The captured request has an empty
    //    srvceType and ctypecheck field (Content-Length 136).
    // ------------------------------------------------------------
    const printForm = new URLSearchParams();
    printForm.append("searchService", "qrPrint");
    printForm.append("applNo", applicationNumber);
    printForm.append("serviceCode", serviceCode);
    printForm.append("hiddenval", "");
    printForm.append("hiddenServiceType", "RC");
    printForm.append("srvceType", "");
    printForm.append("scode", "");
    printForm.append("applicationNo", "");
    printForm.append("token", "");
    printForm.append("ctypecheck", "");

    const printResponse = await fetch(PDF_URL, {
      method: "POST",
      headers: browserHeaders(cookies, {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/pdf,application/octet-stream,*/*",
        Origin: ORIGIN,
        Referer: SEARCH_URL,
        "Upgrade-Insecure-Requests": "1",
      }),
      body: printForm.toString(),
      cache: "no-store",
      redirect: "manual",
    });

    cookies = mergeCookies(cookies, printResponse);

    let pdfResponse = printResponse;

    // Preserve the same official session if openSearch.pdf redirects.
    if (printResponse.status >= 300 && printResponse.status < 400) {
      const location = printResponse.headers.get("location");
      if (location) {
        const redirected = await fetch(new URL(location, PDF_URL).toString(), {
          method: "GET",
          headers: browserHeaders(cookies, {
            Accept: "application/pdf,application/octet-stream,*/*",
            Referer: PDF_URL,
          }),
          cache: "no-store",
          redirect: "manual",
        });
        cookies = mergeCookies(cookies, redirected);
        pdfResponse = redirected;
      }
    }

    let pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    let contentType = pdfResponse.headers.get("content-type") || "";

    if (!looksLikePdf(pdfBytes)) {
      // Retry the SAME official print flow after refreshing the search page.
      // openSearch.pdf is a POST endpoint; do not replace this with GET.
      const refresh = await getWithSession(SEARCH_URL, cookies, SEARCH_PAGE_URL);
      cookies = refresh.cookies;
      await refresh.response.text();

      const retryForm = new URLSearchParams();
      retryForm.set("searchService", "qrPrint");
      retryForm.set("applNo", applicationNumber);
      retryForm.set("serviceCode", serviceCode);
      retryForm.set("hiddenval", "");
      retryForm.set("hiddenServiceType", "RC");
      retryForm.set("srvceType", "");
      retryForm.set("scode", "");
      retryForm.set("applicationNo", "");
      retryForm.set("token", "");
      retryForm.set("ctypecheck", "");

      const retryResponse = await fetch(PDF_URL, {
        method: "POST",
        headers: browserHeaders(cookies, {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8",
          Origin: ORIGIN,
          Referer: SEARCH_URL,
          "Upgrade-Insecure-Requests": "1",
        }),
        body: retryForm.toString(),
        cache: "no-store",
        redirect: "manual",
      });

      cookies = mergeCookies(cookies, retryResponse);
      pdfResponse = retryResponse;

      if (retryResponse.status >= 300 && retryResponse.status < 400) {
        const location = retryResponse.headers.get("location");
        if (location) {
          const redirectedRetry = await fetch(
            new URL(location, PDF_URL).toString(),
            {
              method: "GET",
              headers: browserHeaders(cookies, {
                Accept: "application/pdf,application/octet-stream,*/*",
                Referer: PDF_URL,
              }),
              cache: "no-store",
              redirect: "manual",
            }
          );
          cookies = mergeCookies(cookies, redirectedRetry);
          pdfResponse = redirectedRetry;
        }
      }

      pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
      contentType = pdfResponse.headers.get("content-type") || "";
    }

    if (!looksLikePdf(pdfBytes)) {
      const preview = new TextDecoder().decode(pdfBytes.slice(0, 300));
      console.error("e-District non-PDF response:", {
        status: pdfResponse.status,
        contentType,
        byteLength: pdfBytes.byteLength,
        preview,
        applicationNumber,
        serviceCode,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Kerala e-District did not return the official PDF for this application. Please try Print again.",
        },
        { status: 502 }
      );
    }

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": looksLikePdfContentType(contentType)
          ? contentType.split(";")[0]
          : "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName(applicationNumber)}"`,
        "Content-Length": String(pdfBytes.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("e-District official PDF error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to download the official e-District PDF.",
      },
      { status: 502 }
    );
  }
}
