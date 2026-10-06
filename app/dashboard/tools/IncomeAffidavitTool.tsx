"use client";

import React,{useEffect,useMemo,useRef,useState} from "react";
import { createPortal } from "react-dom";
import {Download,Eye,FileSignature,FileText,History,Keyboard,Printer,RotateCcw,Save,Search,Trash2,X} from "lucide-react";

type Data=Record<string,string>;
type RecordItem={id:string;name:string;house_name:string;mobile:string;ration_card:string;updated_at:string;data:Data};
type Props={onClose?:()=>void};

const MEMBERS=[
 ["Applicant","അപേക്ഷകൻ/അപേക്ഷക"],["Spouse","ഭാര്യ/ഭർത്താവ്"],["Father","പിതാവ്"],["Mother","മാതാവ്"],
 ["Child 1","മകൻ/മകൾ - 1"],["Child 2","മകൻ/മകൾ - 2"],["Sibling 1","സഹോദരൻ/സഹോദരി - 1"],
 ["Sibling 2","സഹോദരൻ/സഹോദരി - 2"],["Dependants / others","ആശ്രയിച്ചു കഴിയുന്നവർ/മറ്റുള്ളവർ"]
];
const today=new Date().toISOString().slice(0,10);
const initial:Data={
 village:"",place:"",house:"",parent:"",rel:"",applicant:"",mobile:"",years:"",houseno:"",ration:"",
 aadhaar:"",voter:"",purpose:"",appno:"",fam_total:"",own_house:"",house_type:"",floor_area:"",rent:"",
 land_total:"",land_agri:"",land_res:"",crop:"",has_vehicle:"",veh_type:"",veh_use:"",inc_adult:"",
 inc_earning:"",inc_tech:"",inc_wage:"",inc_dis:"",inc_fixed:"",inc_biz:"",inc_total:"",docs:"",
 sign_place:"",sign_date:today,signer:"",...Object.fromEntries(MEMBERS.flatMap((_,i)=>[
  [`fm_${i}_name`,""],[`fm_${i}_age`,""],[`fm_${i}_job`,""]
 ]))
};
const opts:Record<string,string[]>={
 rel:["മകൻ","മകൾ"],own_house:["ഉണ്ട്","ഇല്ല"],house_type:["ഓല","ഓട്","ഷീറ്റ്","ടെറസ് - ഒരു നില","ടെറസ് - ഇരുനില"],
 has_vehicle:["ഉണ്ട്","ഇല്ല"],veh_type:["കാർ","ബൈക്ക്","ഓട്ടോ റിക്ഷ","വാൻ","ഹെവി വാഹനം"],
 veh_use:["സ്വകാര്യ വാഹനം","പാസഞ്ചർ വാഹനം","ഗുഡ്സ് വാഹനം","കാരിയർ"]
};
const money=(v:string)=>{const n=v.replace(/[^0-9]/g,"");return n?`₹ ${Number(n).toLocaleString("en-IN")}/-`:v};
const dateFmt=(v:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);return m?`${m[3]}/${m[2]}/${m[1]}`:v};
const F=(v:string)=>v||"____________________________";

export default function IncomeAffidavitTool({onClose}:Props){
 const [form,setForm]=useState<Data>(initial),[auto,setAuto]=useState(true),[records,setRecords]=useState<RecordItem[]>([]);
 const [historyOpen,setHistoryOpen]=useState(false),[previewOpen,setPreviewOpen]=useState(false),[query,setQuery]=useState("");
 const [toast,setToast]=useState(""),[busy,setBusy]=useState(false),[dirty,setDirty]=useState(false),[currentId,setCurrentId]=useState<string|null>(null);
 const [sidebarInset,setSidebarInset]=useState(72);
 const pages=useRef<(HTMLDivElement|null)[]>([]);
 useEffect(()=>{try{
  const f=localStorage.getItem("income_affidavit_form");if(f)setForm({...initial,...JSON.parse(f)});
  setAuto(localStorage.getItem("aff_auto_convert")!=="0");
  const h=localStorage.getItem("income_affidavit_history_v2");if(h)setRecords(JSON.parse(h));
 }catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("income_affidavit_form",JSON.stringify(form))}catch{}},[form]);
 useEffect(()=>{const t=setTimeout(()=>setToast(""),2600);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>{
  const html=document.documentElement, body=document.body;
  const dashboard=document.querySelector(".dashboard-content") as HTMLElement | null;
  const prevHtml=html.style.overflow;
  const prevBody=body.style.overflow;
  const prevDashboard=dashboard?.style.overflowY || "";
  html.style.overflow="hidden";
  body.style.overflow="hidden";
  if(dashboard) {
    dashboard.style.overflowY="hidden";
    dashboard.classList.add("income-affidavit-open");
  }
  return()=>{
    html.style.overflow=prevHtml;
    body.style.overflow=prevBody;
    if(dashboard) {
      dashboard.style.overflowY=prevDashboard;
      dashboard.classList.remove("income-affidavit-open");
    }
  };
 },[]);
 useEffect(()=>{
  const updateInset=()=>{
   if(window.innerWidth<768){setSidebarInset(0);return;}
   const shell=document.querySelector(".dashboard-sidebar-shell") as HTMLElement|null;
   const rail=document.querySelector('[aria-label="Collapsed navigation"]') as HTMLElement|null;
   const shellRect=shell?.getBoundingClientRect();
   const railRect=rail?.getBoundingClientRect();
   const expanded=!!shellRect && shellRect.width>80 && shellRect.right>0;
   const right=expanded ? shellRect!.right : (railRect && railRect.width>0 ? railRect.right : 68);
   setSidebarInset(Math.max(68,Math.round(right+10)));
  };
  updateInset();
  const ro=new ResizeObserver(updateInset);
  const shell=document.querySelector(".dashboard-sidebar-shell");
  const rail=document.querySelector('[aria-label="Collapsed navigation"]');
  if(shell) ro.observe(shell);
  if(rail) ro.observe(rail);
  const timer=window.setInterval(updateInset,250);
  window.addEventListener("resize",updateInset);
  return()=>{ro.disconnect();window.clearInterval(timer);window.removeEventListener("resize",updateInset)};
 },[]);
 const set=(k:string,v:string)=>{setForm(p=>({...p,[k]:v}));setDirty(true)};
 const convert=async(k:string)=>{if(!auto)return;const v=form[k]?.trim();if(!v||!/^[A-Za-z0-9 .,/'-]+$/.test(v))return;try{
  const r=await fetch(`https://inputtools.google.com/request?text=${encodeURIComponent(v)}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`);
  const d=await r.json(),x=d?.[1]?.[0]?.[1]?.[0];if(x)setForm(p=>({...p,[k]:x}));
 }catch{}};
 const adults=useMemo(()=>MEMBERS.reduce((n,_,i)=>n+(Number(form[`fm_${i}_age`])>=18?1:0),0),[form]);
 const income=useMemo(()=>Number(form.inc_fixed?.replace(/[^0-9]/g,"")||0)+Number(form.inc_biz?.replace(/[^0-9]/g,"")||0),[form.inc_fixed,form.inc_biz]);
 useEffect(()=>{if(adults&&form.inc_adult!==String(adults))setForm(p=>({...p,inc_adult:String(adults)}))},[adults]);
 useEffect(()=>{if(income&&form.inc_total!==String(income))setForm(p=>({...p,inc_total:String(income)}))},[income]);

 const save=()=>{if(!form.applicant.trim()){setToast("Please enter Applicant Name");return}
  const id=currentId||`aff-${Date.now()}`,r:RecordItem={id,name:form.applicant,house_name:form.house,mobile:form.mobile,ration_card:form.ration,updated_at:new Date().toISOString(),data:{...form}};
  setRecords(old=>{const n=[r,...old.filter(x=>x.id!==id)];try{localStorage.setItem("income_affidavit_history_v2",JSON.stringify(n))}catch{}return n});
  setCurrentId(id);setDirty(false);setToast("Affidavit saved successfully");
 };
 const load=(r:RecordItem)=>{setForm({...initial,...r.data});setCurrentId(r.id);setDirty(false);setHistoryOpen(false);setToast("Affidavit loaded")};
 const remove=(id:string)=>{if(!confirm("Are you sure you want to permanently delete this saved affidavit?"))return;setRecords(o=>{const n=o.filter(x=>x.id!==id);try{localStorage.setItem("income_affidavit_history_v2",JSON.stringify(n))}catch{}return n});setToast("Affidavit deleted")};
 const clear=()=>{if(!confirm("Clear all Income Affidavit fields?"))return;setForm({...initial,sign_date:new Date().toISOString().slice(0,10)});setCurrentId(null);setDirty(false);setToast("Form cleared")};

 const docPage=(page:1|2)=>{const land=(form.land_agri||form.land_res)?`കൃഷിഭൂമി: ${form.land_agri||"—"} / വാസഗൃഹം: ${form.land_res||"—"}`:"";
  const ids=[["വീട്ടു നം",form.houseno],["റേഷൻ കാർഡ് നം",form.ration],["ആധാർ കാർഡ് നം",form.aadhaar],["വോട്ടർ ഐഡി നം.",form.voter]].filter(x=>x[1]).map(x=>x.join(" ")).join(" • ")||"—";
  const q=(rows:Array<[number,string,string]>)=><table className="ia-doc-table"><tbody>{rows.map(r=><tr key={r[0]}><td className="n">{r[0]}</td><td>{r[1]}</td><td className="a">{r[2]||"—"}</td></tr>)}</tbody></table>;
  if(page===1)return <><div className="ia-doc-title">വരുമാന സർട്ടിഫിക്കറ്റിനുള്ള അപേക്ഷയിൽ അന്വേഷണ ഉദ്യോഗസ്ഥൻ<br/>മുൻപാകെ അപേക്ഷകൻ നൽകുന്ന സ്റ്റേറ്റ്മെന്റ്</div>
   <div className="ia-doc-sub">(അപേക്ഷകൻ മൈനറാണെങ്കിൽ രക്ഷാകർത്താവ് നൽകണം)</div>
   <p className="ia-doc-p">{F(form.village)} വില്ലേജിൽ {F(form.place)} എന്ന സ്ഥലത്ത് {F(form.house)} എന്ന വീട്ടിൽ {F(form.parent)} <b>{form.rel||"മകൻ/മകൾ"}</b> {F(form.applicant)} (മൊബൈൽ നമ്പർ {F(form.mobile)}) നൽകുന്ന സ്റ്റേറ്റ്മെന്റ്.</p>
   <p className="ia-doc-p"><b>1.</b> ഞാനുൾപ്പെടുന്ന കുടുംബം ഈ വില്ലേജിൽ {F(form.years)} വർഷമായി സ്ഥിരമായി താമസിച്ചു വരുന്നു.<br/>[{ids}]</p>
   <p className="ia-doc-p"><b>2.</b> എനിക്ക് {F(form.purpose)} ആവശ്യത്തിനായി വരുമാന സർട്ടിഫിക്കറ്റ് ആവശ്യമുണ്ട്. അപേക്ഷാ നമ്പർ {F(form.appno)} ആണ്.</p>
   <p className="ia-doc-p"><b>3.</b> എന്റെ കുടുംബാംഗങ്ങളുടെ വിവരം ചുവടെ ചേർക്കുന്നു.</p>
   <table className="ia-doc-table"><thead><tr><th></th><th>അംഗങ്ങളുടെ വിവരം</th><th>പേര്</th><th>വയസ്സ്</th><th>തൊഴിൽ/പ്രവൃത്തി</th></tr></thead><tbody>
   {MEMBERS.map((m,i)=><tr key={m[0]}><td className="n">{i+1}</td><td>{m[0]}<small>{m[1]}</small></td><td className="a">{form[`fm_${i}_name`]||"—"}</td><td className="a">{form[`fm_${i}_age`]||"—"}</td><td className="a">{form[`fm_${i}_job`]||"—"}</td></tr>)}
   <tr><td colSpan={2}><b>ആകെ എണ്ണം</b></td><td className="a" colSpan={3}>{form.fam_total||String(MEMBERS.filter((_,i)=>form[`fm_${i}_name`]).length)||"—"}</td></tr></tbody></table>
   <div className="ia-doc-head">4. താമസ സ്ഥലം സംബന്ധിച്ച വിവരങ്ങൾ</div>{q([[1,"കുടുംബത്തിന് സ്വന്തമായി വീടുണ്ടോ",form.own_house],[2,"വീടിന്റെ തരം (ഓല, ഓട്, ഷീറ്റ്, ടെറസ് - ഒരു നില, ഇരുനില)",form.house_type],[3,"വീടിന്റെ തറ വിസ്തീർണ്ണം",form.floor_area],[4,"വാടക വീടാണെങ്കിൽ വാടക എത്ര",form.rent]])}
   <div className="ia-doc-head">5. കുടുംബാംഗങ്ങളുടെ കൈവശത്തിലുള്ള ഭൂമിയുടെ വിവരണം</div>{q([[1,"കുടുംബാംഗങ്ങളുടെ കൈവശത്തിലുള്ള ഭൂമിയുടെ ആകെ വിസ്തീർണ്ണം",form.land_total],[2,"കൃഷിഭൂമിയെത്ര, വാസഗൃഹം സ്ഥിതിചെയ്യുന്ന ഭൂമിയെത്ര",land],[3,"കൃഷി ഭൂമിയാണെങ്കിൽ ഏതു തരം കൃഷിയാണ് ചെയ്തു വരുന്നത്",form.crop]])}
   <div className="ia-doc-head">6. കുടുംബാംഗങ്ങളുടെ ഉടമസ്ഥതയിലുള്ള വാഹനങ്ങളുടെ വിവരം</div>{q([[1,"കുടുംബാംഗങ്ങളുടെ ഉടമസ്ഥതയിൽ വാഹനങ്ങൾ ഉണ്ടോ",form.has_vehicle],[2,"വാഹനത്തിന്റെ തരം (കാർ, ബൈക്ക്, ഓട്ടോ റിക്ഷ, വാൻ, ഹെവി വാഹനം)",form.veh_type],[3,"സ്വകാര്യ വാഹനമോ, പാസഞ്ചർ വാഹനമോ, ഗുഡ്സ് വാഹനമോ, കാരിയറോ",form.veh_use]])}
  </>;
  return <><div className="ia-doc-head" style={{marginTop:0}}>7. വരുമാനം സംബന്ധിച്ച വിവരങ്ങൾ</div><table className="ia-doc-table"><tbody>
   {[["കുടുംബാംഗങ്ങളിൽ പ്രായപൂർത്തിയായവർ എത്ര",form.inc_adult],["തൊഴിൽ ചെയ്യുന്നവർ / വരുമാനം ആർജ്ജിക്കുന്നവർ എത്ര",form.inc_earning],["സാങ്കേതിക പരിജ്ഞാനം ആവശ്യമുള്ള തൊഴിൽ ചെയ്യുന്നവർ എത്ര",form.inc_tech],["കൂലിപ്പണി, കൈത്തൊഴിൽ, ദിവസക്കൂലി, താത്കാലിക തൊഴിലുകൾ ചെയ്യുന്നവർ എത്ര",form.inc_wage],["തൊഴിൽ ചെയ്യാൻ കഴിവില്ലാത്തവർ, തൊഴിൽ പഠിക്കുന്നവർ ഉണ്ടെങ്കിൽ എത്ര",form.inc_dis],["ശമ്പളം, പെൻഷൻ മുതലായ സ്ഥിര വരുമാനം ഉള്ളവർ എത്ര",form.inc_fixed?money(form.inc_fixed):""],["കച്ചവടം, വ്യാപാരം, പ്രൊഫഷൻ, വിദേശ വരുമാനം ലഭിക്കുന്നവർ എത്ര",form.inc_biz?money(form.inc_biz):""],["ആകെ വാർഷിക കുടുംബ വരുമാനം എത്ര",form.inc_total?money(form.inc_total):""]].map((r,i)=><tr key={i}><td className="n">{i+1}</td><td style={{width:"60%"}}>{r[0]}</td><td className="a">{r[1]||"—"}</td></tr>)}<tr><td colSpan={3} className="ia-note">(എല്ലാ കുടുംബാംഗങ്ങളും കഴിഞ്ഞ ഒരു വർഷം എല്ലാ സ്രോതസ്സുകളിൽ നിന്നും ആർജ്ജിച്ച വരുമാനം കൂട്ടിയെടുത്ത് ആകെ തുക എഴുതണം.)</td></tr></tbody></table>
   <div className="ia-doc-head">9. തെളിവിനായി നൽകിയിട്ടുള്ള രേഖകളുടെ വിവരം</div><div className="ia-doc-small">(ശമ്പള സർട്ടിഫിക്കറ്റ്, ബാങ്ക് സ്റ്റേറ്റ്മെന്റ്, ആദായനികുതി റിട്ടേൺ, ബാങ്ക് പാസ് ബുക്ക്, കരം അടച്ച രസീത് തുടങ്ങിയവ)</div><div className="ia-doc-box">{form.docs}</div>
   <div className="ia-doc-decl">സത്യപ്രസ്താവന</div><p className="ia-doc-p">മുകളിൽ നൽകിയിട്ടുള്ള വിവരങ്ങൾ പൂർണ്ണവും, ശരിയും, സത്യവുമാകുന്നു. ആയതിന് വിരുദ്ധമായി തെളിയുന്നതു വഴി സർക്കാരിനോ മറ്റാർക്കെങ്കിലുമോ എന്തെങ്കിലും കഷ്ടനഷ്ടങ്ങൾക്ക് ഇടവരികയാണെങ്കിൽ ആയത് എന്നിൽ നിന്നും ഈടാക്കുന്നതിനും, തെറ്റായ വിവരങ്ങളുടെ അടിസ്ഥാനത്തിൽ നൽകാനിടയായ സർട്ടിഫിക്കറ്റ് റദ്ദു ചെയ്യുന്നതിനും ആയതു വഴി ലഭിച്ച എല്ലാ ആനുകൂല്യങ്ങളും റദ്ദു ചെയ്യുന്നതിനും എനിക്ക് പൂർണ്ണ സമ്മതമാണ്.</p>
   <div className="ia-sign"><div>സ്ഥലം - {form.sign_place||form.place||"____________"}<br/>തീയതി - {dateFmt(form.sign_date)||"____________"}</div><div className="ia-sign-right"><div className="ia-sigline"/><b>{form.signer||form.applicant||"________________"}</b><div>അപേക്ഷകന്റെ / രക്ഷിതാവിന്റെ പേരും ഒപ്പും.</div></div></div>
   <div className="ia-foot"><div className="ia-dash"/><div>റിമാർക്ക്: ______________________________</div><div>[അന്വേഷണ ഉദ്യോഗസ്ഥൻ / വില്ലേജ് ഓഫീസർ]</div></div></>;
 };

 const print=()=>{const html=pages.current.filter(Boolean).map(x=>x!.outerHTML).join("");const w=window.open("","_blank");if(!w)return;w.document.write(`<html><head><title>Income Affidavit</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"><style>@page{size:A4;margin:0}body{margin:0}.ia-page{width:794px;min-height:1123px;padding:46px 52px;box-sizing:border-box;page-break-after:always;font-family:'Noto Sans Malayalam','Nirmala UI',Arial}.ia-page:last-child{page-break-after:auto}.ia-doc-title{text-align:center;font-weight:800;font-size:18px;line-height:1.6}.ia-doc-sub{text-align:center;font-size:11px}.ia-doc-p{font-size:13px;line-height:1.75;text-align:justify}.ia-doc-head{font-size:13px;font-weight:800;margin:12px 0 6px;border-bottom:1px solid #334155;padding:5px}.ia-doc-table{width:100%;border-collapse:collapse;font-size:11px}.ia-doc-table td,.ia-doc-table th{border:1px solid #334155;padding:5px}.ia-doc-table .n{width:34px;text-align:center}.ia-doc-table .a{text-align:left}.ia-doc-table small{display:block;color:#64748b;font-size:9px}.ia-doc-box{border:1px solid #334155;min-height:46px;padding:7px}.ia-doc-decl{text-align:center;font-weight:900;margin:15px}.ia-sign{display:flex;justify-content:space-between;margin-top:35px;font-size:11px}.ia-sign-right{text-align:center;min-width:230px}.ia-sigline{height:26px;border-bottom:1px solid #111}.ia-foot{margin-top:30px;font-size:10px}.ia-dash{border-top:1px dashed #64748b}</style></head><body>${html}</body></html>`);w.document.close();setTimeout(async()=>{try{if(w.document.fonts)await w.document.fonts.ready}catch{} w.print()},700)};
 const pdf=async()=>{setBusy(true);try{if(typeof document!=="undefined"&&"fonts"in document){await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))}const html2canvas=(await import("html2canvas")).default;const {jsPDF}=await import("jspdf");const p=new jsPDF({unit:"mm",format:"a4"});for(let i=0;i<pages.current.length;i++){const el=pages.current[i];if(!el)continue;const c=await html2canvas(el,{scale:2,backgroundColor:"#fff",useCORS:true});if(i)p.addPage();p.addImage(c.toDataURL("image/jpeg",.95),"JPEG",0,0,210,(c.height*210)/c.width)}p.save(`Income_Affidavit_${dateFmt(form.sign_date).replaceAll("/","-")||"form"}.pdf`);setToast("PDF downloaded")}catch{setToast("PDF generation failed")}finally{setBusy(false)}};

 const field=(k:string,label:string,ml:string,placeholder="",phonetic=false)=><label className="ia-field"><span>{label}<small>{ml}</small></span><div className="ia-input-wrap"><input value={form[k]||""} placeholder={placeholder} onChange={e=>set(k,e.target.value)} onBlur={()=>convert(k)}/>{phonetic&&<button type="button" onClick={()=>setToast("Type English and leave the field to convert to Malayalam")}><Keyboard size={15}/></button>}</div></label>;
 const select=(k:string,label:string,ml:string)=><label className="ia-field"><span>{label}<small>{ml}</small></span><select value={form[k]||""} onChange={e=>set(k,e.target.value)}><option value="">— Select —</option>{(opts[k]||[]).map(x=><option key={x}>{x}</option>)}</select></label>;
 const filtered=records.filter(r=>{const q=query.toLowerCase();return !q||[r.name,r.house_name,r.mobile,r.ration_card].some(x=>x.toLowerCase().includes(q))});

 return typeof document !== "undefined" ? createPortal(<div className="ia-overlay" style={{"--ia-left":`${sidebarInset}px`} as React.CSSProperties}><div className="ia-shell">
  <header className="ia-header"><div className="ia-logo"><FileSignature size={20}/><div><h1>Income Affidavit</h1><span>Income Certificate Affidavit</span></div><b>MPM250</b></div>
   <div className="ia-actions"><label className="ia-toggle"><input type="checkbox" checked={auto} onChange={e=>{setAuto(e.target.checked);localStorage.setItem("aff_auto_convert",e.target.checked?"1":"0")}}/><span/> Auto Convert <em>മലയാളം</em></label>
    <button onClick={save}><Save size={15}/>Save</button><button className="purple" onClick={()=>setHistoryOpen(true)}><History size={15}/>History</button><button className="light" onClick={()=>setPreviewOpen(true)}><Eye size={15}/>Preview</button><button className="light" onClick={print}><Printer size={15}/>Print</button><button className="green" onClick={pdf} disabled={busy}><Download size={15}/>{busy?"Preparing...":"Download PDF"}</button>{onClose&&<button className="close" onClick={onClose}><X size={18}/></button>}
   </div></header>
  <main className="ia-main"><section className="ia-hero"><h2><FileText size={18}/> Income Certificate Affidavit</h2><p>വരുമാന സർട്ടിഫിക്കറ്റിനുള്ള അപേക്ഷയിൽ അന്വേഷണ ഉദ്യോഗസ്ഥൻ മുൻപാകെ അപേക്ഷകൻ നൽകുന്ന സ്റ്റേറ്റ്മെന്റ്</p><small>Type in English and leave the field — it can convert to Malayalam automatically.</small></section>
   <section className="ia-card"><h3><span>👤</span> Applicant Details <em>അപേക്ഷകന്റെ വിവരങ്ങൾ</em></h3><div className="ia-grid">{field("village","Village","വില്ലേജ്","e.g. kanjikuzhy",true)}{field("place","Place","സ്ഥലം","e.g. kottayam",true)}{field("house","House name","വീട്ടുപേര്","e.g. puthenpurackal",true)}{field("parent","Parent / guardian name","പിതാവ്/രക്ഷാകർത്താവിന്റെ പേര്","Father / guardian name",true)}{select("rel","Relation","മകൻ / മകൾ")}{field("applicant","Applicant name","അപേക്ഷകന്റെ പേര്","Applicant name",true)}{field("mobile","Mobile number","മൊബൈൽ നമ്പർ","10-digit mobile")}</div></section>
   <section className="ia-card"><h3><span>1</span> Residence & IDs <em>സ്ഥിര താമസം</em></h3><div className="ia-grid">{field("years","Years residing in this village","വർഷമായി സ്ഥിരമായി താമസിക്കുന്നു","e.g. 25")}{field("houseno","House number","വീട്ടു നം")}{field("ration","Ration card number","റേഷൻ കാർഡ് നം")}{field("aadhaar","Aadhaar card number","ആധാർ കാർഡ് നം")}{field("voter","Voter ID number","വോട്ടർ ഐഡി നം")}</div></section>
   <section className="ia-card"><h3><span>2</span> Purpose <em>ആവശ്യം</em></h3><div className="ia-grid two">{field("purpose","Purpose of income certificate","ആവശ്യത്തിനായി","e.g. scholarship, ews, bank loan",true)}{field("appno","Application number","അപേക്ഷാ നമ്പർ")}</div></section>
   <section className="ia-card"><h3><span>3</span> Family Members <em>കുടുംബാംഗങ്ങളുടെ വിവരം</em></h3><div className="ia-family-head"><div>Member</div><div>Name</div><div>Age</div><div>Occupation</div></div>{MEMBERS.map((m,i)=><div className="ia-family-row" key={m[0]}><div className="who">{m[0]}<small>{m[1]}</small></div>{field(`fm_${i}_name`,"","Name","Name",true)}{field(`fm_${i}_age`,"","Age","Age")}{field(`fm_${i}_job`,"","Occupation","Occupation",true)}</div>)}<div className="ia-total">Total members (ആകെ എണ്ണം): <input value={form.fam_total||""} onFocus={()=>setForm(p=>({...p,fam_total:String(MEMBERS.filter((_,i)=>p[`fm_${i}_name`]).length)}))} onChange={e=>set("fam_total",e.target.value)}/></div></section>
   <section className="ia-card"><h3><span>4</span> Residence Details <em>താമസ സ്ഥലം സംബന്ധിച്ച വിവരങ്ങൾ</em></h3><div className="ia-grid">{select("own_house","Family owns a house?","സ്വന്തമായി വീടുണ്ടോ")}{select("house_type","House type","വീടിന്റെ തരം")}{field("floor_area","Floor area of house","തറ വിസ്തീർണ്ണം","e.g. 850 sq.ft",true)}{field("rent","Rent (if rented house)","വാടക എത്ര","e.g. 3000",true)}</div></section>
   <section className="ia-card"><h3><span>5</span> Land Held by Family <em>ഭൂമിയുടെ വിവരണം</em></h3><div className="ia-grid">{field("land_total","Total land area held","ആകെ വിസ്തീർണ്ണം","e.g. 10 cent",true)}{field("land_agri","Agricultural land","കൃഷിഭൂമിയെത്ര","e.g. 5 cent",true)}{field("land_res","Land with residence","വാസഗൃഹം സ്ഥിതിചെയ്യുന്ന ഭൂമിയെത്ര","e.g. 5 cent",true)}{field("crop","Type of cultivation","ഏതു തരം കൃഷി","e.g. rubber, coconut",true)}</div></section>
   <section className="ia-card"><h3><span>6</span> Vehicles Owned <em>വാഹനങ്ങളുടെ വിവരം</em></h3><div className="ia-grid">{select("has_vehicle","Family owns vehicles?","വാഹനങ്ങൾ ഉണ്ടോ")}{select("veh_type","Vehicle type","വാഹനത്തിന്റെ തരം")}{select("veh_use","Usage","സ്വകാര്യ / പാസഞ്ചർ / ഗുഡ്സ് / കാരിയർ")}</div></section>
   <section className="ia-card"><h3><span>7</span> Income Details <em>വരുമാനം സംബന്ധിച്ച വിവരങ്ങൾ</em></h3><div className="ia-grid">{field("inc_adult","Adult members","പ്രായപൂർത്തിയായവർ എത്ര","Auto from family table")}{field("inc_earning","Working / earning members","തൊഴിൽ ചെയ്യുന്നവർ / വരുമാനം ആർജ്ജിക്കുന്നവർ","number or text",true)}{field("inc_tech","Technical-skill occupations","സാങ്കേതിക പരിജ്ഞാനം ആവശ്യമുള്ള തൊഴിൽ","number or text",true)}{field("inc_wage","Wage / manual / daily / temporary work","കൂലിപ്പണി, കൈത്തൊഴിൽ, ദിവസക്കൂലി, താത്കാലികം","number or text",true)}{field("inc_dis","Unable to work / learning a trade","തൊഴിൽ ചെയ്യാൻ കഴിവില്ലാത്തവർ, തൊഴിൽ പഠിക്കുന്നവർ","number or text",true)}{field("inc_fixed","Fixed income (salary, pension…)","ശമ്പളം, പെൻഷൻ മുതലായ സ്ഥിര വരുമാനം","Amount (₹)",true)}{field("inc_biz","Business / profession / foreign income","കച്ചവടം, വ്യാപാരം, പ്രൊഫഷൻ, വിദേശ വരുമാനം","Amount (₹)",true)}{field("inc_total","Total annual family income (₹)","ആകെ വാർഷിക കുടുംബ വരുമാനം","Auto: fixed + business")}</div></section>
   <section className="ia-card"><h3><span>9</span> Supporting Documents & Signature <em>തെളിവിനായി നൽകിയ രേഖകൾ</em></h3><div className="ia-grid"><div className="ia-span">{field("docs","Documents submitted as proof","ശമ്പള സർട്ടിഫിക്കറ്റ്, ബാങ്ക് സ്റ്റേറ്റ്മെന്റ്, ആദായനികുതി റിട്ടേൺ...","e.g. salary certificate, bank passbook",true)}</div>{field("sign_place","Place (signing)","സ്ഥലം","defaults to Place above",true)}<label className="ia-field"><span>Date<small>തീയതി</small></span><input type="date" value={form.sign_date||""} onChange={e=>set("sign_date",e.target.value)}/></label>{field("signer","Name on signature line (if guardian signs)","രക്ഷിതാവിന്റെ പേര്","defaults to applicant name",true)}</div></section>
   <div className="ia-bottom-actions"><button className="ghost" onClick={clear}><RotateCcw size={16}/>Clear</button><button onClick={save}><Save size={16}/>Save</button><button className="light" onClick={print}><Printer size={16}/>Print</button><button className="light" onClick={()=>setPreviewOpen(true)}><Eye size={16}/>Preview</button><button className="gradient" onClick={pdf} disabled={busy}><Download size={16}/>{busy?"Preparing...":"Download PDF"}</button></div>
  </main>
  {toast&&<div className="ia-toast">{toast}</div>}
  {previewOpen&&<div className="ia-modal-bg" onMouseDown={e=>e.currentTarget===e.target&&setPreviewOpen(false)}><div className="ia-preview-modal"><div className="ia-modal-head"><b><Eye size={17}/> Affidavit Preview</b><div><button onClick={print}><Printer size={15}/>Print</button><button className="green" onClick={pdf}><Download size={15}/>PDF</button><button onClick={()=>setPreviewOpen(false)}><X size={17}/></button></div></div><div className="ia-preview-body">{([1,2] as const).map(p=><div className="ia-preview-sheet" key={p}><div className="ia-page">{docPage(p)}</div></div>)}</div></div></div>}
  {historyOpen&&<div className="ia-modal-bg" onMouseDown={e=>e.currentTarget===e.target&&setHistoryOpen(false)}><div className="ia-history-modal"><div className="ia-modal-head"><b><History size={17}/> Saved Affidavits</b><button onClick={()=>setHistoryOpen(false)}><X size={17}/></button></div><div className="ia-history-search"><Search size={16}/><input placeholder="Search name, mobile, ration, house..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="ia-history-table-wrap"><table><thead><tr><th>Name</th><th>House</th><th>Mobile</th><th>Ration</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{filtered.length?filtered.map(r=><tr key={r.id}><td><b>{r.name}</b></td><td>{r.house_name||"—"}</td><td>{r.mobile||"—"}</td><td>{r.ration_card||"—"}</td><td>{new Date(r.updated_at).toLocaleString("en-IN")}</td><td><button className="open" onClick={()=>load(r)}><FileText size={13}/>Open</button><button className="delete" onClick={()=>remove(r.id)}><Trash2 size={13}/>Delete</button></td></tr>):<tr><td colSpan={6} className="empty">No saved records found.</td></tr>}</tbody></table></div></div></div>}
  <div className="ia-print-host">{([1,2] as const).map((p,i)=><div className="ia-page" key={p} ref={el=>{pages.current[i]=el}}>{docPage(p)}</div>)}</div>
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;500;600;700;800;900&display=swap');
    .dashboard-content.income-affidavit-open{overflow:hidden!important;overflow-y:hidden!important}
body:has(.ia-overlay){overflow:hidden!important}
html:has(.ia-overlay){overflow:hidden!important}
   .ia-overlay{font-synthesis:none;position:fixed;top:0;right:0;bottom:0;left:var(--ia-left,68px);z-index:40;width:calc(100vw - var(--ia-left,68px));height:100dvh;max-height:100dvh;overflow-y:auto;overflow-x:hidden;background:linear-gradient(135deg,#e0f2fe,#f0e8ff 50%,#e0f7fa);font-family:'Noto Sans Malayalam','Nirmala UI',sans-serif;color:#1e293b}.ia-header{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.82);backdrop-filter:blur(16px);padding:10px 18px;border-bottom:1px solid #ffffff88;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}.ia-logo,.ia-actions,.ia-bottom-actions,.ia-modal-head,.ia-toggle{display:flex;align-items:center;gap:7px}.ia-logo{color:#0369a1}.ia-logo h1{margin:0;font-size:19px;font-weight:800;background:linear-gradient(135deg,#0ea5e9,#7c3aed);background-clip:text;color:transparent}.ia-logo span{display:block;font-size:10px;color:#64748b}.ia-logo b{font-size:10px;background:#eef8fe;padding:5px 9px;border-radius:999px}.ia-actions{flex-wrap:wrap}.ia-actions button,.ia-bottom-actions button,.ia-modal-head button{border:0;border-radius:11px;padding:8px 11px;background:#0284c7;color:#fff;font-weight:700;font-size:12px;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.ia-actions .purple{background:#4f46e5}.ia-actions .green,.ia-bottom-actions .gradient,.ia-modal-head .green{background:linear-gradient(135deg,#10b981,#0ea5e9)}.ia-actions .light,.ia-bottom-actions .light,.ia-modal-head button{background:#fff;color:#334155;border:1px solid #cbd5e1}.ia-actions .close{padding:8px;background:#fff;color:#334155}.ia-actions button:disabled{opacity:.6}.ia-toggle{font-size:11px;font-weight:700;background:#ffffffbb;border:1px solid #bae6fd;padding:5px 8px;border-radius:999px}.ia-toggle input{display:none}.ia-toggle span{width:34px;height:18px;background:#cbd5e1;border-radius:20px;position:relative}.ia-toggle span:after{content:'';position:absolute;width:12px;height:12px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}.ia-toggle input:checked+span{background:linear-gradient(135deg,#0ea5e9,#7c3aed)}.ia-toggle input:checked+span:after{transform:translateX(16px)}.ia-toggle em{font-style:normal;color:#7c3aed}.ia-main{max-width:1100px;margin:auto;padding:20px}.ia-hero{background:linear-gradient(135deg,#0ea5e9ee,#7c3aedea);border-radius:20px;padding:22px 25px;color:#fff;margin-bottom:18px}.ia-hero h2{display:flex;align-items:center;gap:8px;font-size:18px;margin:0}.ia-hero p{font-family:'Noto Sans Malayalam','Nirmala UI',sans-serif;font-size:12px}.ia-hero small{font-size:11px}.ia-card{background:#ffffff7a;backdrop-filter:blur(16px);border:1px solid #ffffff99;border-radius:20px;padding:20px 22px;margin-bottom:16px;box-shadow:0 8px 32px #0ea5e91f}.ia-card h3{display:flex;align-items:center;gap:9px;font-size:15px;margin:0 0 14px}.ia-card h3>span{width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#0ea5e9,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center}.ia-card h3 em{font-style:normal;font-family:'Noto Sans Malayalam','Nirmala UI';font-size:11px;color:#64748b;font-weight:500}.ia-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:13px}.ia-grid.two{grid-template-columns:repeat(2,1fr)}.ia-span{grid-column:1/-1}.ia-field{display:block;min-width:0}.ia-field>span{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:5px}.ia-field>span small{display:block;font-family:'Noto Sans Malayalam','Nirmala UI';font-size:10px;color:#94a3b8;font-weight:500}.ia-field input,.ia-field select,.ia-total input{font-family:'Noto Sans Malayalam','Nirmala UI',Arial,sans-serif;width:100%;padding:10px 12px;border:1.5px solid #0ea5e940;border-radius:11px;background:#ffffffbf;color:#0f172a;outline:none;font:inherit;font-size:13px;box-sizing:border-box}.ia-field input:focus,.ia-field select:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px #0ea5e91f;background:#fff}.ia-input-wrap{display:flex;gap:5px}.ia-input-wrap input{flex:1}.ia-input-wrap button{width:38px;border:1px solid #bae6fd;background:#ffffffaa;border-radius:11px;cursor:pointer}.ia-family-head,.ia-family-row{display:grid;grid-template-columns:170px 1.3fr 80px 1.2fr;gap:8px;align-items:center}.ia-family-head{font-size:10px;font-weight:800;padding-bottom:7px}.ia-family-row{margin-bottom:8px}.ia-family-row .who{font-size:11px;font-weight:700}.ia-family-row .who small{display:block;font-family:'Noto Sans Malayalam','Nirmala UI';font-size:9px;color:#94a3b8}.ia-family-row .ia-field>span{display:none}.ia-total{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800}.ia-total input{width:90px}.ia-bottom-actions{justify-content:flex-end;flex-wrap:wrap;margin:6px 0 40px}.ia-bottom-actions .ghost{background:#ffffffbf;color:#475569}.ia-toast{position:fixed;right:20px;bottom:20px;z-index:13000;background:#0f172a;color:#fff;padding:11px 15px;border-radius:12px;font-size:12px;font-weight:700}.ia-modal-bg{position:fixed;inset:0;z-index:12000;background:#0f172a73;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px}.ia-preview-modal,.ia-history-modal{width:min(960px,96vw);height:min(92vh,100%);background:#fff;border-radius:20px;overflow:hidden;display:flex;flex-direction:column}.ia-modal-head{justify-content:space-between;padding:12px 16px;border-bottom:1px solid #e2e8f0}.ia-modal-head>div{display:flex;gap:7px}.ia-preview-body{flex:1;overflow:auto;padding:20px;background:#e2e8f0}.ia-preview-sheet{width:794px;margin:0 auto 20px;background:#fff;box-shadow:0 8px 28px #0f172a40}.ia-history-search{padding:12px 16px;display:flex;gap:8px;border-bottom:1px solid #e2e8f0}.ia-history-search input{flex:1;padding:9px;border:1px solid #cbd5e1;border-radius:9px}.ia-history-table-wrap{overflow:auto}.ia-history-table-wrap table{font-family:'Noto Sans Malayalam','Nirmala UI',Arial,sans-serif;width:100%;border-collapse:collapse;font-size:11px}.ia-history-table-wrap th,.ia-history-table-wrap td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;white-space:nowrap}.ia-history-table-wrap th{background:#f8fafc}.ia-history-table-wrap button{border:0;border-radius:8px;padding:6px 8px;font-size:10px;font-weight:700;margin-right:4px;display:inline-flex;gap:4px;align-items:center;cursor:pointer}.ia-history-table-wrap .open{background:#e0f2fe;color:#0369a1}.ia-history-table-wrap .delete{background:#fee2e2;color:#dc2626}.ia-history-table-wrap .empty{text-align:center;padding:35px;color:#94a3b8}.ia-print-host{position:fixed;left:-100000px;top:0;width:794px}.ia-page{width:794px;min-height:1123px;padding:46px 52px;background:#fff;box-sizing:border-box;color:#111;font-family:'Noto Sans Malayalam','Nirmala UI',Arial,sans-serif}.ia-doc-title{text-align:center;font-weight:800;font-size:18px;line-height:1.6}.ia-doc-sub{text-align:center;font-size:11px;margin:3px 0 14px}.ia-doc-p{font-size:13px;line-height:1.75;text-align:justify;margin:10px 0}.ia-doc-head{font-size:13px;font-weight:800;margin:12px 0 6px;padding:5px 7px;border-bottom:1px solid #334155}.ia-doc-table{width:100%;border-collapse:collapse;font-size:11px}.ia-doc-table th,.ia-doc-table td{border:1px solid #334155;padding:5px 6px;vertical-align:top}.ia-doc-table .n{width:34px;text-align:center}.ia-doc-table .a{text-align:left}.ia-doc-table small{display:block;color:#64748b;font-size:9px}.ia-note{font-size:9px!important;text-align:center}.ia-doc-small{font-size:10px;margin-bottom:4px}.ia-doc-box{border:1px solid #334155;min-height:46px;padding:7px;font-size:11px}.ia-doc-decl{text-align:center;font-weight:900;margin:15px 0 5px}.ia-sign{display:flex;justify-content:space-between;gap:40px;margin-top:35px;font-size:11px}.ia-sign-right{text-align:center;min-width:230px}.ia-sigline{height:26px;border-bottom:1px solid #111}.ia-foot{margin-top:30px;font-size:10px}.ia-dash{border-top:1px dashed #64748b;margin-bottom:8px}@media(max-width:760px){.ia-overlay{left:0;width:100vw}.ia-main{padding:12px}.ia-toggle{display:none}.ia-actions button{padding:8px}.ia-actions button:not(.close){font-size:0}.ia-grid.two{grid-template-columns:1fr}.ia-family-head{display:none}.ia-family-row{grid-template-columns:1fr 90px;padding:9px;background:#ffffff55;border-radius:12px}.ia-family-row .who{grid-column:1/-1}.ia-family-row .ia-field:nth-child(3){grid-column:2}.ia-family-row .ia-field:nth-child(4){grid-column:1/-1}.ia-preview-body{padding:8px}.ia-preview-sheet{transform:scale(.8);transform-origin:top left;margin-bottom:-220px}.ia-logo span,.ia-logo b{display:none}}@media print{body>*{display:none!important}.ia-print-host{display:block!important;position:static!important;left:auto!important;width:auto!important}.ia-page{page-break-after:always}.ia-page:last-child{page-break-after:auto}}
  `}</style>
 </div></div>, document.body) : null;
}
