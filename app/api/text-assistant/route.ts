import { NextRequest, NextResponse } from "next/server";

type Action = "translate"|"grammar"|"improve"|"formal"|"simple"|"explain"|"summarize";

const LOCAL_FIXES: Array<[RegExp, string]> = [
  [/\bteh\b/gi, "the"],
  [/\brecieve\b/gi, "receive"],
  [/\bseperate\b/gi, "separate"],
  [/\btomorow\b/gi, "tomorrow"],
  [/\bdefinately\b/gi, "definitely"],
  [/\boccured\b/gi, "occurred"],
];

function localProcess(text: string, action: Action) {
  let value = text.trim();

  if (action === "grammar") {
    for (const [pattern, replacement] of LOCAL_FIXES) value = value.replace(pattern, replacement);
    return value.replace(/\s+([,.!?])/g, "$1").replace(/([.!?])\s*/g, "$1 ");
  }

  if (action === "improve" || action === "formal" || action === "simple") {
    return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  }

  if (action === "explain") {
    return value;
  }

  if (action === "summarize") {
    const sentences = value.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.slice(0, 3).join(" ");
  }

  return value;
}

function languageCode(language: string) {
  return language === "Malayalam" ? "ml" : "en";
}

async function translateWithMyMemory(text: string, sourceLanguage: string, targetLanguage: string) {
  const source = languageCode(sourceLanguage);
  const target = languageCode(targetLanguage);

  if (source === target) return text;

  // MyMemory's public endpoint is used server-side, so no browser CORS/API-key setup is needed.
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error("Free translation service is temporarily unavailable.");
  }

  const translated = data?.responseData?.translatedText;
  if (!translated) {
    throw new Error(data?.responseDetails || "Translation failed.");
  }

  return String(translated);
}

export async function POST(req: NextRequest) {
  try {
    const { text, action, sourceLanguage, targetLanguage } = await req.json();

    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Please enter some text." }, { status: 400 });
    }

    const validActions: Action[] = [
      "translate", "grammar", "improve", "formal", "simple", "explain", "summarize",
    ];

    if (!validActions.includes(action as Action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    if (action === "translate") {
      // Keep the free provider request reasonably sized.
      if (text.length > 4500) {
        return NextResponse.json(
          { error: "For free translation, please translate up to 4,500 characters at a time." },
          { status: 413 }
        );
      }

      try {
        const result = await translateWithMyMemory(
          text,
          sourceLanguage || "English",
          targetLanguage || "Malayalam"
        );
        return NextResponse.json({ result, mode: "free" });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Free translation failed." },
          { status: 502 }
        );
      }
    }

    // These tools now work without OpenAI/API billing by using local text processing.
    return NextResponse.json({
      result: localProcess(text, action as Action),
      mode: "local",
    });
  } catch {
    return NextResponse.json({ error: "Text processing failed." }, { status: 500 });
  }
}
