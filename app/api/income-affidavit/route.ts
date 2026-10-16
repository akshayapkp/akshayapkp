import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { getResumeSession } from "@/lib/resume-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Income Affidavit database is not configured.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function safeData(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 100 || entries.some(([k,v]) => k.length > 80 || (typeof v !== "string" && v !== null))) return null;
  const out: Record<string,string> = {};
  for (const [k,v] of entries) out[k] = typeof v === "string" ? v.slice(0,2000) : "";
  return out;
}
function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const bucket = (globalThis as any).__affidavitRateLimit || ((globalThis as any).__affidavitRateLimit = new Map());
  const old = bucket.get(ip);
  if (!old || now-old.start > 10*60_000) bucket.set(ip,{count:1,start:now});
  else { old.count++; if(old.count>12) return true; }
  return false;
}
export async function POST(request: Request) {
  if (limited(request)) return NextResponse.json({error:"Too many submissions. Please wait and try again."},{status:429});
  try {
    const body = await request.json();
    const data = safeData(body?.data);
    if (!data || !String(data.applicant || "").trim()) return NextResponse.json({error:"Applicant name is required."},{status:400});
    const database = db();
    const {data: saved,error} = await database.from("income_affidavit_submissions").insert({
      id: randomUUID(), data, applicant_name:String(data.applicant||"").slice(0,160),
      mobile:String(data.mobile||"").slice(0,30), house_name:String(data.house||"").slice(0,160),
      ration_card:String(data.ration||"").slice(0,80), source:"customer-qr"
    }).select("id,created_at").single();
    if(error) throw error;
    return NextResponse.json({success:true,id:saved.id,createdAt:saved.created_at},{status:201});
  } catch(error) {
    console.error("Income Affidavit public submit failed:",error);
    return NextResponse.json({error:"Could not save the application. Please contact the centre."},{status:503});
  }
}
export async function GET() {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({error:"Staff login required."},{status:401});
  try {
    const {data,error}=await db().from("income_affidavit_submissions")
      .select("id,data,applicant_name,mobile,house_name,ration_card,status,allow_customer_download,source,created_at,updated_at")
      .order("created_at",{ascending:false}).limit(500);
    if(error) throw error;
    return NextResponse.json({success:true,data:data||[]});
  } catch(error) {
    console.error("Income Affidavit history load failed:",error);
    return NextResponse.json({error:"Could not load shared history. Check the database migration and environment variables."},{status:503});
  }
}
export async function PATCH(request: Request) {
  const session = await getResumeSession();
  if (!session) return NextResponse.json({error:"Staff login required."},{status:401});
  try {
    const body=await request.json();
    const id=String(body?.id||"");
    const data=safeData(body?.data);
    if(!id || !data || !String(data.applicant||"").trim()) return NextResponse.json({error:"A valid application and applicant name are required."},{status:400});
    const update:any={data,applicant_name:String(data.applicant||"").slice(0,160),mobile:String(data.mobile||"").slice(0,30),house_name:String(data.house||"").slice(0,160),ration_card:String(data.ration||"").slice(0,80),updated_at:new Date().toISOString()};
    if(typeof body.allowCustomerDownload==="boolean") update.allow_customer_download=body.allowCustomerDownload;
    if(typeof body.status==="string" && ["pending","printed","completed"].includes(body.status)) update.status=body.status;
    const {error}=await db().from("income_affidavit_submissions").update(update).eq("id",id);
    if(error) throw error;
    return NextResponse.json({success:true});
  } catch(error) {
    console.error("Income Affidavit update failed:",error);
    return NextResponse.json({error:"Could not update the application."},{status:503});
  }
}
export async function DELETE(request: Request) {
  const session=await getResumeSession();
  if(!session) return NextResponse.json({error:"Staff login required."},{status:401});
  const id=new URL(request.url).searchParams.get("id");
  if(!id) return NextResponse.json({error:"Application ID is required."},{status:400});
  try {
    const {error}=await db().from("income_affidavit_submissions").delete().eq("id",id);
    if(error) throw error;
    return NextResponse.json({success:true});
  } catch(error) {
    console.error("Income Affidavit delete failed:",error);
    return NextResponse.json({error:"Could not delete the application."},{status:503});
  }
}
