"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, FileText, Plus, RotateCcw, Search, Share2, Trash2, X, Printer } from "lucide-react";
import { SERVICE_CATALOG, ServiceCatalogItem, ServiceDocument } from "./serviceDocumentCatalog";
import { toPng } from "html-to-image";

type Draft = { id: string; service: ServiceCatalogItem | null; documents: ServiceDocument[] };
const CENTER = { name: "Akshaya e Centre", place: "POOKIPARAMB", address: "POOKIPARAMB, MALAPPURAM", whatsapp: "9037296582", phone: "9447906582" };

export default function ServiceDocumentGeneratorTool({ onClose }: { onClose?: () => void }) {
  const [language, setLanguage] = useState<"en" | "ml">("en");
  const [query, setQuery] = useState("");
  const [docQuery, setDocQuery] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [serviceOpen, setServiceOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const allDocs = useMemo(() => { const seen = new Set<string>(); return SERVICE_CATALOG.flatMap(s => s.docs).filter(d => { const k=d.en+"|"+d.ml; if(seen.has(k)) return false; seen.add(k); return true; }); }, []);
  const services = useMemo(() => { const q=query.trim().toLowerCase(); return (q ? SERVICE_CATALOG.filter(s => (s.name+" "+s.ml).toLowerCase().includes(q)) : SERVICE_CATALOG).slice(0,100); }, [query]);
  const docs = useMemo(() => { const q=docQuery.trim().toLowerCase(); return (q ? allDocs.filter(d => (d.en+" "+d.ml).toLowerCase().includes(q)) : allDocs).slice(0,100); }, [allDocs,docQuery]);
  const activeIndex=drafts.findIndex(d=>d.id===activeId);
  const active=activeIndex>=0?drafts[activeIndex]:null;
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-service-picker]")) setServiceOpen(false);
      if (!target.closest("[data-document-picker]")) setDocOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const ds=(s:ServiceCatalogItem)=>language==="ml"?s.ml:s.name;
  const dd=(d:ServiceDocument)=>language==="ml"?d.ml:d.en;
  const makeId=()=>typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
  const toastMsg=(s:string)=>{setToast(s);window.setTimeout(()=>setToast(""),1800);};
  function chooseService(service:ServiceCatalogItem){ if(activeIndex>=0)setDrafts(p=>p.map((d,i)=>i===activeIndex?{...d,service,documents:[...service.docs]}:d)); else {const d={id:makeId(),service,documents:[...service.docs]};setDrafts(p=>[...p,d]);setActiveId(d.id);} setQuery(""); }
  function addService(){const d={id:makeId(),service:null,documents:[]};setDrafts(p=>[...p,d]);setActiveId(d.id);setQuery("");setDocQuery("");}
  function removeService(index:number){const next=drafts.filter((_,i)=>i!==index);setDrafts(next);setActiveId(next[index]?.id||next[index-1]?.id||null);}
  function setDocuments(next:ServiceDocument[]){if(activeIndex>=0)setDrafts(p=>p.map((d,i)=>i===activeIndex?{...d,documents:next}:d));}
  function addDocument(d:ServiceDocument){if(!active)return;if(!active.documents.some(x=>x.en===d.en&&x.ml===d.ml))setDocuments([...active.documents,d]);setDocQuery("");setDocOpen(false);}
  function addTypedDocument(){
    const value=docQuery.trim();
    if(!active || !value) return;
    if(active.documents.some(d => (language === "ml" ? d.ml : d.en).trim().toLowerCase() === value.toLowerCase())) { setDocQuery(""); setDocOpen(false); return; }
    const custom={ en:value, ml:value };
    setDocuments([...active.documents, custom]);
    setDocQuery("");
    setDocOpen(false);
    toastMsg("Document added");
  }
  function reset(){setDrafts([]);setActiveId(null);setQuery("");setDocQuery("");setNote("");setToast("");}
  async function share(){
    if(!previewRef.current) return;
    try {
      const blob=await toPng(previewRef.current,{pixelRatio:2,backgroundColor:"#ffffff",cacheBust:true}).then(dataUrl=>fetch(dataUrl).then(r=>r.blob()));
      if(!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("image clipboard unavailable");
      await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
      toastMsg("Image copied to clipboard");
    } catch {
      toastMsg("Image copy failed");
    }
  }
  function printA4(){
    const list=drafts.filter(d=>d.service&&d.documents.length);if(!list.length)return;
    const now=new Date(),date=now.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),time=now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true});
    let rows="";list.forEach(d=>d.documents.forEach((doc,i)=>{rows+="<tr>"+(i===0?"<td class=\"service\" rowspan=\""+d.documents.length+"\">"+esc(ds(d.service!))+"</td>":"")+"<td class=\"num\">"+(i+1)+"</td><td>"+esc(dd(doc))+"</td><td class=\"check\">✓</td></tr>";}));
    const noteHtml=note.trim()?"<div class=\"note\"><b>Note:</b> "+esc(note.trim())+"</div>":"";
    const css=`@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#142d5d;font-family:Arial,'Noto Sans Malayalam','Nirmala UI',sans-serif}.page{width:210mm;min-height:297mm;padding:15mm 16mm 12mm;background:#fff}.head{display:grid;grid-template-columns:72px 1fr 65px;gap:12px;align-items:center;border-bottom:2px solid #1693e6;padding-bottom:7px}.logo{width:68px;height:68px;object-fit:contain}.brand{text-align:center}.brand h1{margin:0;color:#087ab8;font-size:18px;font-weight:800}.brand h2{margin:2px 0 0;color:#102e61;font-size:13px}.brand p{margin:3px 0;color:#555;font-size:9px}.contact{font-size:9px;font-weight:800}.mission{width:55px;height:60px;border:1px solid #d4d4d4;border-radius:12px;background:linear-gradient(135deg,#fff,#f7edb2);display:flex;align-items:center;justify-content:center;text-align:center;font-size:7px;font-weight:800;color:#6b5b13}.mission b{display:block;color:#167c75;font-size:8px}.title{text-align:center;margin:6px 0;font-size:12px;letter-spacing:3px;font-weight:900}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5px}th,td{border:1px solid #555;padding:5px 7px;vertical-align:middle}th{background:#e7f2fa;text-align:left}th.service{width:31%}th.num{width:6%;text-align:center}th.doc{width:56%}th.check{width:7%;text-align:center}td.service{background:#f4f9fd;font-weight:800;line-height:1.25}td.num{text-align:center}td.check{text-align:center;color:#138b72;font-size:14px;font-weight:900}.note{margin-top:7px;border:1px solid #cbd5e1;padding:5px;font-size:8.5px;color:#334155}.foot{text-align:right;margin-top:7px;color:#666;font-size:8px}`;
    const html="<!doctype html><html><head><meta charset=\"utf-8\"><title>Document List</title><style>"+css+"</style></head><body><div class=\"page\"><div class=\"head\"><img class=\"logo\" src=\"/akshaya-logo.png\"><div class=\"brand\"><h1>"+CENTER.name+"</h1><h2>"+CENTER.place+"</h2><p>"+CENTER.address+"</p><div class=\"contact\">◉ "+CENTER.whatsapp+" &nbsp; | &nbsp; ☎ "+CENTER.phone+"</div></div><div class=\"mission\"><div><b>KERALA</b>STATE<br>MISSION</div></div></div><div class=\"title\">DOCUMENTS REQUIRED</div><table><thead><tr><th class=\"service\">Service</th><th class=\"num\">#</th><th class=\"doc\">Document</th><th class=\"check\">✓</th></tr></thead><tbody>"+rows+"</tbody></table>"+noteHtml+"<div class=\"foot\">"+date+" · "+time+"</div></div></body></html>";
    const w=window.open("","_blank");if(!w){toastMsg("Allow pop-ups to print");return;}w.document.open();w.document.write(html);w.document.close();w.focus();window.setTimeout(()=>w.print(),450);
  }
  return <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/30 p-2 backdrop-blur-sm"><div className="flex h-[96vh] w-full max-w-[1220px] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-[#f3f8fd] text-slate-800 shadow-2xl">
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm"><div className="flex items-center gap-3"><div className="h-10 w-10 overflow-hidden rounded-xl border border-cyan-100 bg-white shadow-sm"><img src="/akshaya-logo.png" alt="Akshaya" className="h-full w-full object-contain p-1"/></div><div><h2 className="text-base font-extrabold">Service Document Generator</h2><p className="text-[10px] text-slate-500">Build a required-documents list for your customers</p></div></div><div className="flex items-center gap-2"><button onClick={reset} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><RotateCcw size={14} className="mr-1 inline"/>Reset</button><button onClick={printA4} disabled={!drafts.some(d=>d.service&&d.documents.length)} className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40"><Printer size={14} className="mr-1 inline"/>Print A4</button><button onClick={share} disabled={!drafts.some(d=>d.service)} className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40"><Share2 size={14} className="mr-1 inline"/>Share</button>{onClose&&<button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600"><X size={17}/></button>}</div></header>
    <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-5"><div className="grid gap-4 lg:grid-cols-2">
      <section ref={previewRef} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="text-xs font-extrabold uppercase tracking-[0.13em] text-sky-600">Configure Document List</h3><div className="rounded-full border border-slate-200 bg-slate-50 p-1"><button onClick={()=>setLanguage("en")} className={"rounded-full px-3 py-1.5 text-[11px] font-bold "+(language==="en"?"bg-sky-500 text-white":"text-slate-500")}>English</button><button onClick={()=>setLanguage("ml")} className={"rounded-full px-3 py-1.5 text-[11px] font-bold "+(language==="ml"?"bg-sky-500 text-white":"text-slate-500")}>മലയാളം</button></div></div>
        <label className="mb-1.5 block text-xs font-extrabold text-slate-700">Service <span className="font-normal text-slate-400">(search and select)</span></label><div className="relative" data-service-picker><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-sky-500"/><input value={query} onFocus={()=>setServiceOpen(true)} onClick={()=>setServiceOpen(true)} onChange={e=>{setQuery(e.target.value);setServiceOpen(true)}} placeholder="Search services..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-9 text-sm outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"/><ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400"/>{serviceOpen&&<div className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">{services.map(s=><button key={s.name} onClick={()=>{chooseService(s);setServiceOpen(false)}} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50">{ds(s)}</button>)}</div>}</div>
        {active&&<><div className="mb-2 mt-4 flex items-center justify-between"><label className="text-xs font-extrabold">Documents <span className="font-normal text-slate-400">(auto-loaded)</span></label><button onClick={()=>removeService(activeIndex)} className="text-[10px] font-bold text-rose-500">Remove service</button></div><div className="flex min-h-14 flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">{active.documents.length?active.documents.map((d,i)=><span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-[11px] font-bold text-sky-700 shadow-sm">{dd(d)}<button onClick={()=>setDocuments(active.documents.filter((_,j)=>j!==i))}><X size={12}/></button></span>):<span className="text-xs text-slate-400">No documents</span>}</div><label className="mb-1.5 mt-4 block text-xs font-extrabold">Add Document <span className="font-normal text-slate-400">(from catalogue)</span></label><div className="relative" data-document-picker><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={docQuery} onFocus={()=>setDocOpen(true)} onClick={()=>setDocOpen(true)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTypedDocument()}}} onChange={e=>{setDocQuery(e.target.value);setDocOpen(true)}} placeholder="Search documents or type a new document..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"/>{docOpen&&<div className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl">{docs.map((d,i)=><button key={i} onClick={()=>addDocument(d)} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs font-semibold hover:bg-sky-50">{dd(d)}</button>)}{docQuery.trim()&&!docs.some(d=>(language==="ml"?d.ml:d.en).trim().toLowerCase()===docQuery.trim().toLowerCase())&&<button onClick={addTypedDocument} className="mt-1 block w-full rounded-lg border-t border-slate-100 bg-emerald-50 px-3 py-2.5 text-left text-xs font-extrabold text-emerald-700 hover:bg-emerald-100">+ Add “{docQuery.trim()}” as new document</button>}</div>}</div><button onClick={addService} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-sky-300 bg-sky-50 py-3 text-xs font-extrabold text-sky-700"><Plus size={15}/>Add another service</button><label className="mb-1.5 mt-4 block text-xs font-extrabold">Note <span className="font-normal text-slate-400">(optional)</span></label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Additional note..." className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"/></>}
        {!drafts.length&&<div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center text-xs text-slate-400">Search for a service above to start your document list.</div>}</section>
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="text-xs font-extrabold uppercase tracking-[0.13em] text-sky-600">Document List Preview</h3><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-bold text-sky-700">{drafts.filter(d=>d.service).length} service(s)</span></div>{!drafts.some(d=>d.service)?<div className="flex min-h-[430px] items-center justify-center text-center text-sm text-slate-400"><div><FileText size={40} className="mx-auto mb-3 text-sky-400"/><p>Select a service to see the required documents.</p></div></div>:<div className="space-y-4">{drafts.map((d,i)=>d.service?<div key={d.id} className={"overflow-hidden rounded-2xl border bg-white "+(d.id===activeId?"border-sky-300 shadow-md":"border-slate-200")}><div onClick={()=>setActiveId(d.id)} className="flex cursor-pointer items-center justify-between bg-sky-50 px-4 py-3"><span className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600"><FileText size={15}/></span><span className="truncate text-xs font-extrabold uppercase">{ds(d.service)}</span></span><button onClick={e=>{e.stopPropagation();removeService(i)}} className="text-slate-400 hover:text-rose-500"><Trash2 size={14}/></button></div><div className="divide-y divide-slate-100">{d.documents.map((x,j)=><div key={j} className="flex items-center justify-between px-4 py-2.5 text-xs"><span><b className="mr-2 text-slate-400">{j+1}.</b>{dd(x)}</span><button onClick={()=>{setActiveId(d.id);setDrafts(p=>p.map((v,k)=>k===i?{...v,documents:v.documents.filter((_,n)=>n!==j)}:v))}} className="text-rose-400"><X size={13}/></button></div>)}</div></div>:<div key={d.id} className="rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-4 text-xs font-bold text-sky-700">Select another service from the search box.</div>)}{note.trim()&&<div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs"><b>Note:</b> {note}</div>}</div>}</section>
    </div></main>
    {toast&&<div className="fixed bottom-6 right-6 z-[10020] flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-extrabold text-white shadow-xl"><Check size={15}/>{toast}</div>}
  </div></div>;
}

function esc(value:string){return value.replace(/[&<>"']/g,c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" } as Record<string,string>)[c]||c);}