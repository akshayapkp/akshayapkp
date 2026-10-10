import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const DEFAULT_FOLDER_ID = "1YVeNMiaHVOqkX-FGNUpIsJ4SCQdE4MhH";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("gdrive_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({
      error: "Google Drive authorization is required. Click Connect Google Drive first.",
      authorizeUrl: "/api/google-drive/auth",
    }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const folderId = process.env.GOOGLE_DRIVE_APPLICATION_FORMS_FOLDER_ID || DEFAULT_FOLDER_ID;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google Drive OAuth environment variables are not configured in Vercel." }, { status: 500 });
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid upload form." }, { status: 400 }); }

  const file = form.get("file");
  const formName = String(form.get("name") || "").trim();
  const department = String(form.get("department") || "").trim();
  const office = String(form.get("office") || "").trim();

  if (!(file instanceof File) || !formName || !department || !office) {
    return NextResponse.json({ error: "Form name, department, office and PDF file are required." }, { status: 400 });
  }
  if (file.size < 5 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF must be smaller than 5 MB." }, { status: 413 });
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 415 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return NextResponse.json({ error: "The selected file does not contain a valid PDF header." }, { status: 415 });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: refreshToken, grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    return NextResponse.json({ error: "Google Drive authorization expired or was revoked. Connect Google Drive again." }, { status: 401 });
  }

  const metadata = {
    name: formName.toLowerCase().endsWith(".pdf") ? formName : `${formName}.pdf`,
    mimeType: "application/pdf",
    parents: [folderId],
    description: `Department: ${department}\nOffice: ${office}\nUploaded via Akshaya Center Pookiparamba Application Forms Vault`,
    appProperties: { department, office },
  };
  const boundary = `akshaya_drive_${crypto.randomUUID().replace(/-/g, "")}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, bytes, tail]);

  const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,thumbnailLink,appProperties,description", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length),
    },
    body,
    cache: "no-store",
  });
  const result = await uploadResponse.json();
  if (!uploadResponse.ok) {
    return NextResponse.json({
      error: uploadResponse.status === 403
        ? "Google denied upload access. Confirm Drive API is enabled and the authorized Google account has Editor access to the target folder."
        : "Google Drive upload failed. Check OAuth and folder permissions.",
      details: result?.error?.message,
    }, { status: uploadResponse.status >= 500 ? 502 : uploadResponse.status });
  }

  return NextResponse.json({
    file: {
      ...result,
      department,
      office,
      isPinned: false,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    },
  }, { status: 201 });
}
