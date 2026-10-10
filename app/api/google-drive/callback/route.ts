import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const returnedError = requestUrl.searchParams.get("error");
  const expectedState = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith("gdrive_oauth_state="))?.split("=").slice(1).join("=");

  const fail = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });

  if (returnedError) return fail("Google authorization was cancelled or denied.");
  if (!code || !state || !expectedState || state !== decodeURIComponent(expectedState)) {
    return fail("OAuth state validation failed. Please start authorization again.");
  }

  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const allowedEmail = process.env.GOOGLE_DRIVE_ALLOWED_EMAIL?.trim().toLowerCase();
  if (!clientId || !clientSecret || !allowedEmail) {
    return fail("Set GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET and GOOGLE_DRIVE_ALLOWED_EMAIL in Vercel Environment Variables.", 500);
  }

  const redirectUri = `${requestUrl.origin}/api/google-drive/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) {
    return fail("Google token exchange failed. Check OAuth client settings and redirect URI.", 502);
  }

  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });
  const user = await userResponse.json();
  if (!userResponse.ok || String(user.email || "").toLowerCase() !== allowedEmail || user.verified_email !== true) {
    return fail("This Google account is not allowed to authorize uploads. Use the configured admin Google account.", 403);
  }
  if (!tokens.refresh_token) {
    return fail("Google did not return a refresh token. Revoke this app's access in your Google Account and try again with consent.", 502);
  }

  const response = NextResponse.redirect(new URL("/dashboard/application-forms?driveAuth=success", requestUrl.origin));
  response.cookies.set("gdrive_oauth_state", "", { httpOnly: true, secure: requestUrl.protocol === "https:", sameSite: "lax", path: "/api/google-drive/callback", maxAge: 0 });
  response.cookies.set("gdrive_refresh_token", tokens.refresh_token, {
    httpOnly: true, secure: requestUrl.protocol === "https:", sameSite: "lax",
    path: "/api/google-drive", maxAge: 60 * 60 * 24 * 180,
  });
  return response;
}
