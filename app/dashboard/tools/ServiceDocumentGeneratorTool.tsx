"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, RotateCcw, Search, Share2, Trash2, X, Printer } from "lucide-react";
import { SERVICE_CATALOG, ServiceCatalogItem } from "./serviceDocumentCatalog";

export default function ServiceDocumentGeneratorTool({ onClose }: { onClose?: () => void }) {
  const [language, setLanguage] = useState<"en" | "ml">("en");
  const [serviceQuery, setServiceQuery] = useState("");
  const [selected, setSelected] = useState<ServiceCatalogItem | null>(null);
  const [documents, setDocuments] = useState<ServiceCatalogItem["docs"]>([]);
  const [docQuery, setDocQuery] = useState("");
  const [customServices, setCustomServices] = useState<ServiceCatalogItem[]>([]);
  const [note, setNote] = useState("");

  const allServices = useMemo(() => [...SERVICE_CATALOG, ...customServices], []);
  const filteredServices = useMemo(() => {
    const q = serviceQuery.trim().toLocaleLowerCase();
    if (!q) return allServices.slice(0, 80);
    return allServices.filter(s => [s.name, s.ml].some(v => v.toLocaleLowerCase().includes(q))).slice(0, 80);
  }, [allServices, serviceQuery]);

  const allDocs = useMemo(() => {
    const seen = new Set<string>();
    return SERVICE_CATALOG.flatMap(s => s.docs).filter(d => {
      const k = d.en + "|" + d.ml;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, []);

  const filteredDocs = useMemo(() => {
    const q = docQuery.trim().toLocaleLowerCase();
    return (q ? allDocs.filter(d => [d.en, d.ml].some(v => v.toLocaleLowerCase().includes(q))) : allDocs).slice(0, 80);
  }, [allDocs, docQuery]);

  const displayService = (s: ServiceCatalogItem) => language === "ml" ? s.ml : s.name;
  const displayDoc = (d: ServiceCatalogItem["docs"][number]) => language === "ml" ? d.ml : d.en;

  function chooseService(s: ServiceCatalogItem) {
    setSelected(s);
    setServiceQuery(displayService(s));
    setDocuments(s.docs);
  }

  function addCustomDocument() {
    const value = docQuery.trim();
    if (!value) return;
    if (!documents.some(d => d.en.toLocaleLowerCase() === value.toLocaleLowerCase() || d.ml === value)) {
      setDocuments([...documents, { en: value, ml: value }]);
    }
    setDocQuery("");
  }

  function addAnotherService() {
    const name = window.prompt(language === "ml" ? "സർവീസിന്റെ പേര് നൽകുക" : "Enter service name");
    if (!name?.trim()) return;
    const item = { name: name.trim(), ml: name.trim(), docs: [] };
    setCustomServices(v => [...v, item]);
    chooseService(item);
  }

  function reset() {
    setServiceQuery("");
    setSelected(null);
    setDocuments([]);
    setDocQuery("");
    setNote("");
  }

  function printA4() {
    if (!selected || !documents.length) return;
    const title = displayService(selected);
    const rows = documents.map((d, i) => `<li>${i + 1}. ${escapeHtml(displayDoc(d))}</li>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Document List</title><style>@page{size:A4;margin:18mm}body{font-family:Arial,'Noto Sans Malayalam',sans-serif;color:#111}h1{font-size:22px;margin:0 0 8px}h2{font-size:16px;margin:18px 0 8px;color:#1d4ed8}li{margin:8px 0;font-size:14px}p{white-space:pre-wrap}</style></head><body><h1>Required Documents</h1><h2>${escapeHtml(title)}</h2><ol>${rows}</ol>${note.trim() ? `<p><b>Note:</b> ${escapeHtml(note.trim())}</p>` : ""}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  function share() {
    if (!selected) return;
    const text = [displayService(selected), ...documents.map((d, i) => `${i + 1}. ${displayDoc(d)}`), note.trim() ? `Note: ${note.trim()}` : ""].filter(Boolean).join("\n");
    if (navigator.share) navigator.share({ title: "Required Documents", text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm">
      <div className="flex h-[96vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-950/95 text-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/80 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-500"><FileText size={18}/></div>
            <div><h2 className="text-sm font-black">Service Document Generator</h2><p className="text-[10px] text-slate-400">298 services • required documents</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold"><RotateCcw size={14} className="mr-1 inline"/>Reset</button>
            <button onClick={printA4} disabled={!selected || !documents.length} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold disabled:opacity-40"><Printer size={14} className="mr-1 inline"/>Print A4</button>
            <button onClick={share} disabled={!selected} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold disabled:opacity-40"><Share2 size={14} className="mr-1 inline"/>Share</button>
            {onClose && <button onClick={onClose} className="ml-1 rounded-full bg-white/10 p-2"><X size={17}/></button>}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Configure Document List</h3>
                <div className="rounded-full border border-white/10 bg-white/10 p-1">
                  <button onClick={() => setLanguage("en")} className={`rounded-full px-3 py-1 text-xs font-bold ${language === "en" ? "bg-cyan-500 text-white" : "text-slate-400"}`}>English</button>
                  <button onClick={() => setLanguage("ml")} className={`rounded-full px-3 py-1 text-xs font-bold ${language === "ml" ? "bg-cyan-500 text-white" : "text-slate-400"}`}>മലയാളം</button>
                </div>
              </div>

              <label className="mb-2 block text-sm font-bold">Service <span className="text-xs font-normal text-slate-400">(type to search)</span></label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500"/>
                <input value={serviceQuery} onChange={e => setServiceQuery(e.target.value)} placeholder="Search services..." className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-3 pl-10 pr-3 text-sm outline-none focus:border-cyan-400/70"/>
                {serviceQuery && !selected && <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
                  {filteredServices.map(s => <button key={s.name} onClick={() => chooseService(s)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-cyan-500/15">{displayService(s)}</button>)}
                </div>}
              </div>

              {selected && (
                <>
                  <label className="mb-2 mt-5 block text-sm font-bold">Documents <span className="text-xs font-normal text-slate-400">(click × to remove)</span></label>
                  <div className="flex min-h-16 flex-wrap gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    {documents.length ? documents.map((d, i) => <span key={i} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">{displayDoc(d)}<button onClick={() => setDocuments(v => v.filter((_, j) => j !== i))} className="text-rose-300"><X size={13}/></button></span>) : <span className="text-xs text-slate-500">No documents</span>}
                  </div>

                  <label className="mb-2 mt-5 block text-sm font-bold">Add Document</label>
                  <div className="flex gap-2">
                    <input value={docQuery} onChange={e => setDocQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustomDocument()} placeholder="Search documents or type new..." className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm outline-none focus:border-cyan-400/70"/>
                    <button onClick={addCustomDocument} className="rounded-xl bg-cyan-600 px-4 text-sm font-bold"><Plus size={15} className="mr-1 inline"/>Add</button>
                  </div>
                  {docQuery && <div className="mt-1 max-h-48 overflow-auto rounded-xl border border-white/10 bg-slate-900">
                    {filteredDocs.map((d, i) => <button key={i} onClick={() => { if (!documents.some(x => x.en === d.en)) setDocuments(v => [...v, d]); setDocQuery(""); }} className="block w-full px-4 py-2 text-left text-xs hover:bg-cyan-500/15">{displayDoc(d)}</button>)}
                  </div>}
                  <button onClick={addAnotherService} className="mt-4 w-full rounded-xl border border-dashed border-cyan-400/40 bg-cyan-400/5 py-3 text-sm font-bold text-cyan-300">＋ Add another service</button>

                  <label className="mb-2 mt-5 block text-sm font-bold">Note <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Additional note..." className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 text-sm outline-none focus:border-cyan-400/70"/>
                </>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">Document List Preview</h3>
                {selected && <button onClick={reset} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">Reset</button>}
              </div>
              {!selected ? <div className="flex min-h-[360px] items-center justify-center text-center text-sm text-slate-500"><div><FileText size={38} className="mx-auto mb-3 text-cyan-400"/><p>Pick a service to see its required documents here.</p></div></div> :
                <div><div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4"><div className="font-black text-cyan-100">{displayService(selected)}</div><div className="mt-1 text-xs text-slate-400">{documents.length} document(s)</div></div>
                <ol className="mt-3 space-y-2">{documents.map((d, i) => <li key={i} className="flex items-start justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"><span><span className="mr-2 text-slate-500">{i+1}.</span>{displayDoc(d)}</span><button onClick={() => setDocuments(v => v.filter((_, j) => j !== i))} className="text-rose-300"><Trash2 size={14}/></button></li>)}</ol>
                {note.trim() && <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"><b>Note:</b> {note}</div>}</div>}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c] || c));
}
