import { NextResponse } from "next/server";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const clean = (v: unknown, max = 1800) => typeof v === "string" ? v.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, "").trim().slice(0, max) : "";

function publicError(status: number, message: string) {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("quota") || m.includes("rate")) return "Gemini quota/rate limit reached. Please retry after the limit resets.";
  if (status === 401 || status === 403 || m.includes("api key")) return "Gemini rejected the API key or API access. Check GEMINI_API_KEY in Vercel.";
  if (status === 404 || m.includes("model")) return "The configured Gemini model is unavailable. Check GEMINI_MODEL in Vercel.";
  if (status >= 500) return "Gemini is temporarily unavailable. Please try again.";
  return "Application Writer could not complete the request. Check the Vercel Function log.";
}

export async function POST(request: Request) {
  let session = null;
  try { session = await getResumeSession(); }
  catch (error) {
    console.error("Application Writer session validation failed", error);
    return NextResponse.json({ success:false, message:"Login session validation is not configured. Check RESUME_SESSION_SECRET in Vercel." }, { status:503 });
  }
  if (!session) return NextResponse.json({ success:false, message:"Your secure login session is missing or expired. Sign out and sign in again." }, { status:401 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ success:false, message:"GEMINI_API_KEY is missing from this Vercel deployment. Add it to the required environment and redeploy." }, { status:503 });

  try {
    const body = await request.json();
    const action = body?.action === "translate" ? "translate" : body?.action === "revise" ? "revise" : "generate";
    const language = body?.language === "ml" ? "Malayalam" : "English";
    const type = clean(body?.type, 80) || "application";
    const to = clean(body?.to, 400), from = clean(body?.from, 800);
    const description = clean(body?.description, 1800);
    const existing = clean(body?.existing, 8000);
    const changes = clean(body?.changes, 1200);
    if ((action === "generate" || action === "revise") && (!to || !from || !description)) {
      return NextResponse.json({ success:false, message:"Enter the recipient, applicant details and a short description of the application." }, { status:400 });
    }
    if ((action === "translate" || action === "revise") && !existing) return NextResponse.json({ success:false, message:"There is no existing document to update." }, { status:400 });
    if (action === "revise" && !changes) return NextResponse.json({ success:false, message:"Describe the changes required." }, { status:400 });

    const prompt = action === "revise" ? [
      "You are a careful official-letter editor for Kerala, India.",
      "Make ONLY the requested small changes to the existing letter. Do not rewrite unrelated paragraphs or alter facts.",
      "Keep the same language, tone, structure and official style as the existing letter.",
      "Never invent details. If a requested fact is not supplied, use a clear [placeholder] or omit it.",
      "Document type: " + type,
      "Requested changes: " + changes,
      "Existing document:\n" + existing,
      "Return only the complete revised document body, without explanation or markdown."
    ].join("\\n") : action === "translate" ? [
      "You are a professional Malayalam-English translator for official letters in Kerala, India.",
      "Translate the provided document faithfully into " + language + ".",
      "Preserve names, addresses, numbers, dates, facts, paragraph structure and respectful official tone.",
      "Do not add facts, remove important details, or explain the translation. Return only the translated document.",
      "Document type: " + type,
      "Document text: " + existing
    ].join("\n") : [
      "You are an expert official application and letter writer for an Akshaya service centre in Kerala, India.",
      "Write a complete, polished, formal " + type + " in " + language + ".",
      "Addressed to: " + to,
      "Applicant and address: " + from,
      "Facts and request supplied by the applicant: " + description,
      "The description may be very short or written as keywords. Interpret the user's intent and turn it into a complete, natural official application. For example, 'police clearance certificate for job' means the applicant is requesting issuance of a Police Clearance Certificate for employment.",
      "Do not reject a short description or demand more words. Use reasonable generic wording to connect the stated purpose, but never invent personal facts, dates, addresses, legal requirements or supporting documents. Use [placeholder] only when an essential specific fact is missing.",
      "Target length: about " + Math.max(300, Math.min(1800, Number(body?.length) || 1000)) + " characters.",
      "Use correct official Malayalam when requested, natural respectful language, a clear subject where appropriate, concise paragraphs, and a suitable closing.",
      "Never invent dates, legal provisions, certificates, personal details, or claims. Use only supplied facts; if essential information is missing, omit it or use a clear [placeholder].",
      "Do not include a letterhead, centre contact details, date, place, signature block, markdown, or commentary. Return only the document body."
    ].join("\n");

    const model = clean(process.env.GEMINI_MODEL, 100) || "gemini-3.5-flash-lite";
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
      method:"POST", headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig:{temperature:0.3,maxOutputTokens:1800}}),
      signal:AbortSignal.timeout(45000),cache:"no-store"
    });
    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) {
      const message = typeof data?.error?.message === "string" ? data.error.message : "No provider detail";
      console.error("Application Writer Gemini failure",{status:upstream.status,model,message});
      return NextResponse.json({success:false,message:publicError(upstream.status,message)},{status:upstream.status===429?429:502});
    }
    const content = (data?.candidates?.[0]?.content?.parts ?? []).map((p:{text?:string})=>typeof p?.text==="string"?p.text:"").join("\n").trim().slice(0,10000);
    if (!content) return NextResponse.json({success:false,message:"Gemini returned an empty document. Please review the details and retry."},{status:502});
    const headingMap:Record<string,string>={application:language==="Malayalam"?"അപേക്ഷ":"APPLICATION",complaint:language==="Malayalam"?"പരാതി":"COMPLAINT",affidavit:language==="Malayalam"?"സത്യവാങ്മൂലം":"AFFIDAVIT",request:language==="Malayalam"?"അഭ്യർത്ഥനാകത്ത്":"REQUEST LETTER",declaration:language==="Malayalam"?"സ്വയം പ്രഖ്യാപനം":"SELF DECLARATION",undertaking:language==="Malayalam"?"ഉത്തരവാദിത്ത പ്രഖ്യാപനം":"UNDERTAKING",consent:language==="Malayalam"?"സമ്മതപത്രം":"CONSENT LETTER",explanation:language==="Malayalam"?"വിശദീകരണക്കത്ത്":"EXPLANATION",appeal:language==="Malayalam"?"അപ്പീൽ":"APPEAL"};
    return NextResponse.json({success:true,content,heading:headingMap[type] || (language==="Malayalam"?"രേഖ":"DOCUMENT"),model});
  } catch (error) {
    const timeout = error instanceof Error && (error.name==="TimeoutError" || error.name==="AbortError");
    if (timeout) return NextResponse.json({success:false,message:"Gemini took longer than 45 seconds. Please retry."},{status:504});
    console.error("Application Writer API failed",error);
    return NextResponse.json({success:false,message:"Application Writer API failed. Check the Vercel Function log."},{status:500});
  }
}