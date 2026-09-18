import { NextRequest, NextResponse } from "next/server";

type Action = "translate"|"grammar"|"improve"|"formal"|"simple"|"explain"|"summarize";
const prompts: Record<Action,string> = {
  translate:"Translate the text naturally and accurately. Preserve meaning. Return only the translation.",
  grammar:"Correct grammar, spelling, punctuation and sentence structure. Preserve meaning. Return only corrected text.",
  improve:"Improve clarity and naturalness without changing facts. Return only the improved text.",
  formal:"Rewrite in professional formal language. Preserve meaning. Return only the rewritten text.",
  simple:"Rewrite in simple, easy-to-understand language. Preserve important information. Return only the simplified text.",
  explain:"Explain the meaning clearly in simple language. Do not invent facts.",
  summarize:"Summarize the important points concisely. Do not invent facts."
};

export async function POST(req: NextRequest) {
  try {
    const { text, action, sourceLanguage, targetLanguage } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error:"Please enter some text." }, { status:400 });
    if (!prompts[action as Action]) return NextResponse.json({ error:"Invalid action." }, { status:400 });
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      if (action === "grammar") {
        const fixed = String(text).replace(/\bteh\b/gi,"the").replace(/\brecieve\b/gi,"receive").replace(/\bseperate\b/gi,"separate").replace(/\btomorow\b/gi,"tomorrow").replace(/\s+([,.!?])/g,"$1");
        return NextResponse.json({ result:fixed, mode:"local" });
      }
      return NextResponse.json({ error:"OPENAI_API_KEY is not configured. Text case tools work without it." }, { status:503 });
    }
    const instruction = action === "translate"
      ? prompts.translate + " Translate from " + sourceLanguage + " to " + targetLanguage + "."
      : prompts[action as Action];
    const r = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{ "Content-Type":"application/json", Authorization:"Bearer " + key },
      body:JSON.stringify({ model:process.env.OPENAI_TEXT_MODEL || "gpt-5.6", instructions:instruction, input:String(text) })
    });
    const data = await r.json();
    if (!r.ok) return NextResponse.json({ error:data?.error?.message || "AI request failed." }, { status:502 });
    return NextResponse.json({ result:data?.output_text?.trim() || "" });
  } catch {
    return NextResponse.json({ error:"Text processing failed." }, { status:500 });
  }
}
