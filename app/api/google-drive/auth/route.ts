import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_DRIVE_CLIENT_ID is not configured in Vercel." }, { status: 500 });
  }

  const state = randomBytes(24).toString("hex");
  const url = new URL("/api/google-drive/callback", request.url);
  const redirectUri = `${url.origin}${url.pathname}`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email https://www.googleapis.com/auth/drive");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gdrive_oauth_state", state, {
    httpOnly: true, secure: url.protocol === "https:", sameSite: "lax",
    path: "/api/google-drive/callback", maxAge: 600,
  });
  return response;
}
