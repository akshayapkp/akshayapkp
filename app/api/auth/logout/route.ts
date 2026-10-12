import { NextResponse } from "next/server";
import { resumeSessionCookie } from "@/lib/resume-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(resumeSessionCookie.name, "", { ...resumeSessionCookie, maxAge: 0 });
  return response;
}
