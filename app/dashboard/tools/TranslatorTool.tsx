"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, Check, Clipboard, Languages, Loader2, Sparkles, Trash2, Type, WandSparkles } from "lucide-react";

type Language = "English" | "Malayalam";
type Action = "translate" | "grammar" | "improve" | "formal" | "simple" | "explain" | "summarize";
const HISTORY_KEY = "smart_text_assistant_history";

export default function TranslatorTool({ onClose }: { onClose: () => void }) {
  const [source, setSource] = useState<Language>("English");
  const [target, setTarget] = useState<Language>("Malayalam");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { const x = localStorage.getItem(HISTORY_KEY); if (x) setHistory(JSON.parse(x)); } catch {}
  }, []);

  const save = (item: any) => {
    const next = [{ ...item, id: Date.now(), date: new Date().toLocaleString() }, ...history].slice(0, 20);
    setHistory(next); localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const run = async (action: Action, text = input) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/text-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, action, sourceLanguage: source, targetLanguage: target }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Text processing failed.");
      setOutput(d.result); save({ input: text, output: d.result, action, sourceLanguage: source, targetLanguage: target });
    } catch (e) {
      setOutput(e instanceof Error ? e.message : "Text processing failed.");
    } finally { setLoading(false); }
  };

  const changeInput = (v: string) => {
    setInput(v);
    if (timer.current) clearTimeout(timer.current);
    if (auto && v.trim()) timer.current = setTimeout(() => run("translate", v), 800);
  };

  const sentenceCase = (v: string) => v.toLowerCase().replace(/(^\s*\p{L}|[.!?]\s+\p{L})/gu, m => m.toUpperCase());
  const titleCase = (v: string) => v.toLowerCase().replace(/(^|\s)\p{L}/gu, m => m.toUpperCase());
  const alternating = (v: string) => { let i=0; return v.split("").map(ch => /[A-Za-z]/.test(ch) ? (i++ % 2 ? ch.toUpperCase() : ch.toLowerCase()) : ch).join(""); };
  const copy = async () => { if (output) await navigator.clipboard.writeText(output); };

  const actions: [string, Action, React.ReactNode][] = [
    ["Translate", "translate", <Languages size={14}/>],
    ["Fix Grammar", "grammar", <Check size={14}/>],
    ["Improve", "improve", <Sparkles size={14}/>],
    ["Formal", "formal", <Type size={14}/>],
    ["Simple", "simple", <Type size={14}/>],
    ["Explain", "explain", <WandSparkles size={14}/>],
    ["Summarize", "summarize", <WandSparkles size={14}/>],
  ];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">🌐 Smart Text Assistant</h2>
            <p className="text-xs text-slate-500">English ↔ Malayalam • Grammar • Text Case Tools</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200">Close</button>
        </div>

        <div className="min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <select value={source} onChange={e => setSource(e.target.value as Language)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <option>English</option><option>Malayalam</option>
              </select>
              <button onClick={() => { setSource(target); setTarget(source); setInput(output); setOutput(input); }} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 hover:bg-slate-100"><ArrowLeftRight size={16}/></button>
              <select value={target} onChange={e => setTarget(e.target.value as Language)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                <option>Malayalam</option><option>English</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Auto Translate</label>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><b className="text-sm text-slate-800">{source}</b><button onClick={()=>setInput("")} className="text-xs text-slate-500">Clear</button></div>
              <textarea value={input} onChange={e=>changeInput(e.target.value)} placeholder={source==="English"?"Paste or type English text here…":"മലയാളം ഇവിടെ പേസ്റ്റ് ചെയ്യുക…"} className="min-h-[260px] w-full resize-y border-0 bg-transparent p-4 text-sm leading-7 text-slate-800 outline-none"/>
              <div className="flex justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400"><span>{input.length} chars</span><span>{input.trim()?input.trim().split(/\s+/).length:0} words</span></div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><b className="text-sm text-slate-800">{target}</b><button onClick={copy} disabled={!output} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"><Clipboard size={13}/> Copy</button></div>
              <div className="min-h-[260px] whitespace-pre-wrap p-4 text-sm leading-7 text-slate-800">{loading ? <div className="flex h-[220px] items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={18} className="animate-spin"/> Processing…</div> : output || <span className="text-slate-400">Your result will appear here…</span>}</div>
              <div className="flex justify-between border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400"><span>{output.length} chars</span><span>{output.trim()?output.trim().split(/\s+/).length:0} words</span></div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">AI Text Tools</div>
            <div className="flex flex-wrap gap-2">{actions.map(([label, action, icon]) => <button key={action} onClick={()=>run(action)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">{icon}{label}</button>)}</div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Text Case Tools</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setInput(input.toLowerCase())} className="case-btn">lowercase</button>
              <button onClick={()=>setInput(input.toUpperCase())} className="case-btn">UPPERCASE</button>
              <button onClick={()=>setInput(sentenceCase(input))} className="case-btn">Sentence case</button>
              <button onClick={()=>setInput(titleCase(input))} className="case-btn">Title Case</button>
              <button onClick={()=>setInput(alternating(input))} className="case-btn">aLtErNaTiNg</button>
              <button onClick={()=>setOutput(output.toLowerCase())} className="case-btn">Output lowercase</button>
              <button onClick={()=>setOutput(output.toUpperCase())} className="case-btn">Output UPPERCASE</button>
              <button onClick={()=>setOutput(sentenceCase(output))} className="case-btn">Output Sentence</button>
            </div>
          </div>

          {history.length > 0 && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="mb-2 flex items-center justify-between"><b className="text-xs font-black uppercase tracking-wider text-slate-500">Recent History</b><button onClick={()=>{setHistory([]);localStorage.removeItem(HISTORY_KEY)}} className="text-xs text-red-500"><Trash2 size={13}/></button></div><div className="space-y-2">{history.map(x=><button key={x.id} onClick={()=>{setInput(x.input);setOutput(x.output);setSource(x.sourceLanguage);setTarget(x.targetLanguage)}} className="block w-full truncate rounded-xl bg-slate-50 p-2.5 text-left text-xs text-slate-600 hover:bg-slate-100">{x.action} • {x.input}</button>)}</div></div>}
        </div>

        <style jsx>{`
          .case-btn{border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:600;color:#475569;cursor:pointer}.case-btn:hover{background:#f8fafc;border-color:#93c5fd}
        `}</style>
      </div>
    </div>
  );
}
