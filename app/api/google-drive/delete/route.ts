import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("gdrive_refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Google Drive admin authorization is required." }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const allowedEmail = process.env.GOOGLE_DRIVE_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!clientId || !clientSecret || !allowedEmail) {
    return NextResponse.json({ error: "Google Drive OAuth environment variables are not configured." }, { status: 500 });
  }

  let fileId = "";
  try {
    const body = await request.json();
    fileId = String(body?.fileId || "").trim();
  } catch {
    return NextResponse.json({ error: "A valid file ID is required." }, { status: 400 });
  }
  if (!fileId || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return NextResponse.json({ error: "A valid Google Drive file ID is required." }, { status: 400 });
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
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) {
    return NextResponse.json({ error: "Google Drive authorization expired. Connect Google Drive again." }, { status: 401 });
  }

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const user = await userResponse.json();
  if (!userResponse.ok || String(user.email || "").toLowerCase() !== allowedEmail || user.verified_email !== true) {
    return NextResponse.json({ error: "Only the configured admin Google account can delete files." }, { status: 403 });
  }

  const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  if (!deleteResponse.ok) {
    const result = await deleteResponse.json().catch(() => ({}));
    return NextResponse.json({
      error: deleteResponse.status === 404 ? "File was not found in Google Drive." :
        deleteResponse.status === 403 ? "Google Drive denied delete permission for this file." :
        "Could not delete the file from Google Drive.",
      details: result?.error?.message,
    }, { status: deleteResponse.status >= 500 ? 502 : deleteResponse.status });
  }

  return NextResponse.json({ success: true, fileId });
}
