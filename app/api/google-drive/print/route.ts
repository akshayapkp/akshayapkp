import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("gdrive_refresh_token")?.value;
  if (!refreshToken) return NextResponse.json({ error: "Connect Google Drive with the admin account first." }, { status: 401 });

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Google Drive OAuth settings are missing." }, { status: 500 });

  const fileId = new URL(request.url).searchParams.get("fileId")?.trim() || "";
  if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) return NextResponse.json({ error: "Invalid Google Drive file ID." }, { status: 400 });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) return NextResponse.json({ error: "Google Drive authorization expired. Reconnect Google Drive." }, { status: 401 });

  const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store",
  });
  if (!fileResponse.ok) return NextResponse.json({ error: "Could not retrieve this PDF from Google Drive." }, { status: fileResponse.status === 404 ? 404 : 502 });
  // Stream the PDF directly instead of buffering the entire file in memory.
  // This reduces time-to-first-byte for larger forms.
  return new Response(fileResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="application-form.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
