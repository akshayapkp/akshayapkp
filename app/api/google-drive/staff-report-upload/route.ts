import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const DEFAULT_BACKUP_FOLDER_ID = "1FgFKblyzmlhZQ9HtESFBMgf-GgY0YQmr";

export async function POST(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role.toLowerCase() !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("gdrive_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({
      error: "Connect Google Drive first.",
      authorizeUrl: "/api/google-drive/auth",
    }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || DEFAULT_BACKUP_FOLDER_ID;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Google Drive OAuth is not configured." }, { status: 500 });
  }

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Invalid upload form." }, { status: 400 }); }

  const file = form.get("file");
  const month = String(form.get("month") || "").trim();
  if (!(file instanceof File) || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "A workbook and valid YYYY-MM month are required." }, { status: 400 });
  }
  if (file.size < 8 || file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Workbook must be between 8 bytes and 10 MB." }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  // XLSX is a ZIP container; reject obviously invalid uploads.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    return NextResponse.json({ error: "Invalid XLSX workbook." }, { status: 415 });
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    return NextResponse.json({ error: "Google Drive authorization expired. Connect Drive again." }, { status: 401 });
  }

  const fileName = `Akshaya-PKP-Staff-Report-${month}-${new Date().toISOString().replace(/[:.]/g, "-")}.xlsx`;
  const metadata = {
    name: fileName,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    parents: [folderId],
    description: `Monthly staff performance, salary and attendance report for ${month}. Uploaded by ${session.username}.`,
    appProperties: { reportMonth: month, reportType: "staff-performance-monthly" },
  };
  const boundary = `akshaya_xlsx_${crypto.randomUUID().replace(/-/g, "")}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, bytes, tail]);

  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length),
      },
      body,
      cache: "no-store",
    },
  );
  const result = await uploadResponse.json();
  if (!uploadResponse.ok) {
    return NextResponse.json({
      error: "Google Drive upload failed. Check Drive API and folder access.",
      details: result?.error?.message,
    }, { status: uploadResponse.status >= 500 ? 502 : uploadResponse.status });
  }

  return NextResponse.json({
    file: {
      ...result,
      webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    },
  }, { status: 201 });
}
