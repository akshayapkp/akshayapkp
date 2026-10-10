"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search, RefreshCw, FileText, FileImage, FileSpreadsheet, File, UploadCloud,
  LayoutDashboard, LogOut, Printer, Download, ZoomIn, ZoomOut, X, ChevronDown,
  ChevronRight, Clock3, Star, FolderOpen, SlidersHorizontal, LoaderCircle, Trash2
} from "lucide-react";
import { GOOGLE_DRIVE_CONFIG, DRIVE_ENDPOINT } from "@/app/lib/googledrive";

interface DriveFile {
  id: string; name: string; mimeType: string; size?: string; modifiedTime: string;
  thumbnailLink?: string; webViewLink: string; webContentLink?: string; iconLink?: string;
  department?: string; office?: string; isPinned?: boolean;
}
const DEPARTMENTS = ["Civil Supplies", "Education", "EPF", "Health / Medical", "Income Tax Department", "Kerala Social Security Mission", "KSEB", "LSGD", "Revenue", "Transport", "Other"];
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function departmentFor(file: DriveFile) {
  if (file.department) return file.department;
  const n = clean(file.name);
  if (/ration|fair price|civil supplies|bpl/.test(n)) return "Civil Supplies";
  if (/scholarship|school|education|student|admission|study/.test(n)) return "Education";
  if (/epf|pf claim|provident fund/.test(n)) return "EPF";
  if (/medical|medical fitness|fssi|health|hospital|doctor/.test(n)) return "Health / Medical";
  if (/income tax|pan card|itr|tax return/.test(n)) return "Income Tax Department";
  if (/pension|social security|welfare/.test(n)) return "Kerala Social Security Mission";
  if (/kseb|electricity|power connection/.test(n)) return "KSEB";
  if (/birth|death|marriage|building|property|panchayat|lsgd/.test(n)) return "LSGD";
  if (/income certificate|caste certificate|community certificate|possession|land|revenue/.test(n)) return "Revenue";
  if (/driving licence|driving license|vehicle|rc book|transport/.test(n)) return "Transport";
  return "Other";
}
const isPdf = (f: DriveFile) => (f.mimeType || "").includes("pdf") || f.name.toLowerCase().endsWith(".pdf");
const prettySize = (s?: string) => { if (!s) return ""; const n = Number(s); return n < 1048576 ? `${(n/1024).toFixed(0)} KB` : `${(n/1048576).toFixed(1)} MB`; };

export default function ApplicationFormsPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All departments");
  const [office, setOffice] = useState("All offices");
  const [sortMode, setSortMode] = useState<"latest" | "starred">("latest");
  const [starredIds, setStarredIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [zoom, setZoom] = useState(100);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formOffice, setFormOffice] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [uploadNotice, setUploadNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
      setIsAdmin(String(user.role || "").toLowerCase() === "admin");
    } catch { setIsAdmin(false); }
  }, []);

  useEffect(() => {
    if (!uploadOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
    };
  }, [uploadOpen]);

  const loadFiles = async () => {
    setLoading(true); setUploadNotice("");
    try {
      const response = await fetch(DRIVE_ENDPOINT(GOOGLE_DRIVE_CONFIG.folderId, GOOGLE_DRIVE_CONFIG.apiKey));
      if (!response.ok) throw new Error("Google Drive request failed");
      const data = await response.json();
      const drive: DriveFile[] = (data.files ?? []).map((f: DriveFile) => ({...f, department: departmentFor(f)}));
      let saved: DriveFile[] = [];
      try { saved = JSON.parse(localStorage.getItem("managedApplicationFiles") || "[]"); } catch {}
      const merged = drive.map(f => {
        const local = saved.find((x: DriveFile) => x.id === f.id);
        return local ? {...f, isPinned: local.isPinned, department: local.department || f.department, office: local.office} : f;
      });
      const extras = saved.filter((x: DriveFile) => !drive.some(f => f.id === x.id));
      setFiles([...extras, ...merged]);
    } catch (e) {
      console.error(e);
      try { setFiles(JSON.parse(localStorage.getItem("managedApplicationFiles") || "[]")); }
      catch { setFiles([]); }
      setUploadNotice("Google Drive-ൽ നിന്ന് refresh ചെയ്യാനായില്ല. ലഭ്യമായ saved list ആണ് കാണിക്കുന്നത്.");
    } finally { setLoading(false); }
  };
  useEffect(() => { void loadFiles(); }, []);
  useEffect(() => { try { setStarredIds(JSON.parse(localStorage.getItem("applicationFormStarredIds") || "[]")); } catch { setStarredIds([]); } }, []);

  const offices = useMemo(() => {
    const names = files.filter(f => department === "All departments" || departmentFor(f) === department)
      .map(f => f.office).filter((v): v is string => Boolean(v));
    return ["All offices", ...Array.from(new Set(names)).sort()];
  }, [files, department]);

  const visible = useMemo(() => {
    const term = clean(search);
    return files.filter(f => {
      const d = f.department || departmentFor(f);
      const matches = !term || clean(f.name).includes(term) || clean(d).includes(term) || clean(f.office || "").includes(term);
      return matches && (department === "All departments" || d === department) &&
        (office === "All offices" || (f.office || "") === office) &&
        (sortMode !== "starred" || starredIds.includes(f.id));
    }).sort((a,b) => sortMode === "latest"
      ? new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime()
       : a.name.localeCompare(b.name));
  }, [files, search, department, office, sortMode, starredIds]);

  const toggleStar = (file: DriveFile) => {
    setStarredIds(current => {
      const next = current.includes(file.id) ? current.filter(id => id !== file.id) : [...current, file.id];
      try { localStorage.setItem("applicationFormStarredIds", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const openFile = (f: DriveFile) => { setSelected(f); setZoom(100); };
  const saveLocal = (next: DriveFile[]) => {
    setFiles(next);
    try { localStorage.setItem("managedApplicationFiles", JSON.stringify(next)); } catch {}
  };
  const departmentFromName = (name: string) => departmentFor({ id: "name-inference", name, mimeType: "application/pdf", modifiedTime: "", webViewLink: "" });
  const officeFromName = (name: string) => {
    const n = clean(name);
    if (/online|e service|e seva|portal|website/.test(n)) return "Online Services";
    if (/general|office order|office use|internal/.test(n)) return "General Office";
    return "Common Application Forms";
  };
  const applyFileNameDefaults = (name: string) => {
    const inferredDepartment = departmentFromName(name);
    setFormDepartment(inferredDepartment);
    setFormOffice(officeFromName(name));
  };
  const [uploading, setUploading] = useState(false);
  const handleUpload = async () => {
    if (!formDepartment || !formOffice || !formName.trim() || !formFile) {
      setUploadNotice("Department, Office, Form name, PDF file എന്നിവ എല്ലാം നൽകണം."); return;
    }
    if (formFile.type !== "application/pdf" && !formFile.name.toLowerCase().endsWith(".pdf")) { setUploadNotice("PDF ഫയൽ മാത്രം തിരഞ്ഞെടുക്കുക."); return; }
    if (formFile.size > 5 * 1024 * 1024) { setUploadNotice("ഫയലിന്റെ പരമാവധി വലുപ്പം 5 MB ആണ്."); return; }
    setUploading(true); setUploadNotice("");
    try {
      const body = new FormData();
      body.append("file", formFile);
      body.append("name", formName.trim());
      body.append("department", formDepartment);
      body.append("office", formOffice);
      const response = await fetch("/api/google-drive/upload", { method: "POST", body });
      const result = await response.json();
      if (response.status === 401 && result.authorizeUrl) {
        setUploadNotice(result.error || "Google Drive connect ചെയ്യണം.");
        window.location.href = result.authorizeUrl;
        return;
      }
      if (!response.ok) throw new Error(result.error || "Upload failed");
      const uploaded = result.file as DriveFile;
      saveLocal([{...uploaded, department: formDepartment, office: formOffice}, ...files.filter(f => f.id !== uploaded.id)]);
      setSelected(uploaded);
      setUploadOpen(false); setFormFile(null); setFormName(""); setFormDepartment(""); setFormOffice("");
      setUploadNotice("PDF Google Drive-ലേക്ക് വിജയകരമായി upload ചെയ്തു.");
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : "Upload ചെയ്യാൻ കഴിഞ്ഞില്ല.");
    } finally { setUploading(false); }
  };
  const handleDelete = async () => {
    if (!selected || !isAdmin || deleting) return;
    if (!window.confirm(`Delete \"${selected.name}\" from Google Drive? This cannot be undone from this page.`)) return;
    setDeleting(true); setUploadNotice("");
    try {
      const response = await fetch("/api/google-drive/delete", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: selected.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete document.");
      saveLocal(files.filter(file => file.id !== selected.id));
      setSelected(null);
      setUploadNotice("Document deleted from Google Drive.");
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : "Could not delete document.");
    } finally { setDeleting(false); }
  };
  const handlePrint = async () => {
    if (!selected || printing) return;
    setPrinting(true);
    let objectUrl = "";
    let frame: HTMLIFrameElement | null = null;
    let fallbackTimer: number | undefined;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      frame?.remove();
      frame = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPrinting(false);
    };
    try {
      const response = await fetch(`/api/google-drive/print?fileId=${encodeURIComponent(selected.id)}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Could not prepare the PDF for printing.");
      }
      const blob = await response.blob();
      objectUrl = URL.createObjectURL(blob);
      frame = document.createElement("iframe");
      frame.title = "Print application form";
      frame.style.position = "fixed";
      frame.style.left = "0";
      frame.style.bottom = "0";
      frame.style.width = "1px";
      frame.style.height = "1px";
      frame.style.border = "0";
      frame.style.opacity = "0.01";
      frame.onload = () => {
        const printWindow = frame?.contentWindow;
        if (!printWindow) { cleanup(); return; }
        const handleAfterPrint = () => cleanup();
        printWindow.addEventListener("afterprint", handleAfterPrint, { once: true });
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          cleanup();
          window.open(objectUrl, "_blank", "noopener,noreferrer");
          return;
        }
        // Some browsers do not fire afterprint when the user cancels/closes the dialog.
        // Always release the button state shortly after the dialog is dismissed.
        fallbackTimer = window.setTimeout(cleanup, 5000);
      };
      frame.src = objectUrl;
      document.body.appendChild(frame);
      // If the PDF frame never fires load, don't leave the button disabled forever.
      fallbackTimer = window.setTimeout(cleanup, 20000);
    } catch (error) {
      cleanup();
      window.alert(error instanceof Error ? error.message : "Could not prepare the PDF for printing.");
    }
  };

  const previewUrl = selected ? (selected.id.startsWith("local-preview-") ? selected.webViewLink : `https://drive.google.com/file/d/${selected.id}/preview`) : "";
  const downloadUrl = selected ? `https://drive.google.com/uc?export=download&id=${selected.id}` : "";

  return (
    <main className="min-h-[calc(100vh-72px)] bg-[#eaf5ff] p-3 sm:p-4">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-3">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 p-2 text-white"><FolderOpen size={22}/></div><div><h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Application Forms Vault</h1><p className="text-xs text-slate-500">MPM250 · Akshaya Center Pookiparamba</p></div></div>
          <div className="flex flex-wrap gap-2">
            <a href="/api/google-drive/auth" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-xs font-extrabold text-emerald-700 shadow-sm hover:bg-emerald-50">Connect Google Drive</a>
            <button onClick={() => { setUploadNotice(""); setUploadOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:brightness-105"><UploadCloud size={15}/> Upload Forms</button>
            <a href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2.5 text-xs font-extrabold text-white"><LayoutDashboard size={15}/> Dashboard</a>
          </div>
        </header>

        {uploadNotice && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{uploadNotice}</div>}

        <div className="grid min-h-[calc(100vh-175px)] grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-[520px] flex-col overflow-hidden rounded-[24px] border border-white bg-white/75 p-4 shadow-sm">
            <div className="space-y-2.5">
              <label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search form, department or office..." className="w-full rounded-xl border border-sky-200 bg-white px-9 py-2.5 text-xs outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"/></label>
              <label className="relative block"><select value={department} onChange={e=>{setDepartment(e.target.value);setOffice("All offices");}} className="w-full appearance-none rounded-xl border border-sky-200 bg-white px-3 py-2.5 pr-9 text-xs text-slate-700 outline-none focus:border-sky-500">{["All departments",...DEPARTMENTS].map(d=><option key={d}>{d}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"/></label>
              <label className="relative block"><select value={office} onChange={e=>setOffice(e.target.value)} className="w-full appearance-none rounded-xl border border-sky-200 bg-white px-3 py-2.5 pr-9 text-xs text-slate-700 outline-none focus:border-sky-500 disabled:bg-slate-100" disabled={department==="All departments"}>{(department==="All departments"?["All offices"]:offices).map(o=><option key={o}>{o}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"/></label>
              <p className="text-[11px] text-slate-500">Searching {department === "All departments" ? "all departments" : department}{office !== "All offices" ? ` · ${office}` : ""}</p>
              <div className="grid grid-cols-2 gap-2"><button onClick={()=>setSortMode("latest")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition ${sortMode==="latest"?"border-orange-400 bg-gradient-to-r from-amber-400 to-orange-600 text-white shadow-md":"border-slate-200 bg-white text-slate-600"}`}><Clock3 size={14}/> Latest</button><button onClick={()=>setSortMode("starred")} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition ${sortMode==="starred"?"border-amber-400 bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md":"border-slate-200 bg-white text-slate-600"}`}><Star size={14} fill={sortMode==="starred"?"currentColor":"none"}/> Starred</button></div>
            </div>
            <div className="mt-4 flex items-center justify-between border-b border-slate-200 pb-2"><div className="flex items-center gap-2 text-sm font-black text-slate-800"><FolderOpen size={16} className="text-sky-500"/> {department==="All departments"?"Application Forms":department}</div><span className="text-[10px] font-bold text-slate-500">{visible.length} Forms</span></div>
            <div className="mt-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {loading ? <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-500"><LoaderCircle size={16} className="animate-spin"/> Loading forms...</div> : visible.map(file=><div key={file.id} className={`flex w-full items-center gap-1 rounded-xl border p-1.5 transition hover:border-sky-300 ${selected?.id===file.id?"border-sky-400 bg-white shadow-sm":"border-transparent bg-white/60"}`}><button onClick={()=>openFile(file)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500"><FileText size={19}/></span><span className="min-w-0 flex-1"><span className="block line-clamp-2 text-xs font-bold leading-4 text-slate-700">{file.name}</span><span className="mt-0.5 block truncate text-[10px] text-slate-400">{file.department || departmentFor(file)}{file.office? ` · ${file.office}`:""}{file.size? ` · ${prettySize(file.size)}`:""}</span></button><button onClick={()=>toggleStar(file)} title={starredIds.includes(file.id)?"Remove from Starred":"Add to Starred"} aria-label={starredIds.includes(file.id)?"Remove from Starred":"Add to Starred"} className={`shrink-0 rounded-lg p-2 transition ${starredIds.includes(file.id)?"text-amber-500 hover:bg-amber-50":"text-slate-300 hover:bg-amber-50 hover:text-amber-500"}`}><Star size={17} fill={starredIds.includes(file.id)?"currentColor":"none"}/></button><ChevronRight size={14} className="shrink-0 text-slate-400"/></div>)}
              {!loading && !visible.length && <div className="py-10 text-center text-xs text-slate-500">No forms found. Try another search.</div>}
            </div>
          </aside>

          <section className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-white bg-white/75 p-3 shadow-sm sm:p-4">
            {selected ? <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                  {selected.thumbnailLink ? <button onClick={()=>setZoom(100)} title="First page" className="flex h-[66px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-sky-400 bg-white p-1 shadow-sm"><img src={selected.thumbnailLink} alt="PDF thumbnail" className="max-h-full max-w-full object-contain"/></button> : <div className="flex h-[66px] w-[52px] shrink-0 items-center justify-center rounded-lg border-2 border-sky-400 bg-white text-rose-500"><FileText size={24}/></div>}
                  <div className="min-w-0"><h2 className="line-clamp-2 text-sm font-extrabold text-slate-800">{selected.name}</h2><p className="mt-1 text-[11px] text-slate-500">{selected.department || departmentFor(selected)} · {prettySize(selected.size) || "PDF / document"}</p></div>
                </div>
                <div className="flex flex-wrap gap-2"><button onClick={()=>setZoom(z=>Math.max(50,z-10))} title="Zoom out" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ZoomOut size={16}/></button><span className="self-center text-xs font-bold text-slate-500">{zoom}%</span><button onClick={()=>setZoom(z=>Math.min(150,z+10))} title="Zoom in" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ZoomIn size={16}/></button><button onClick={()=>window.open(downloadUrl,"_blank","noopener,noreferrer")} className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-2 text-xs font-extrabold text-white"><Download size={14}/> Download</button><button onClick={handlePrint} disabled={printing} title="Open the printer dialog for this PDF" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"><Printer size={14}/>{printing ? "Preparing..." : "Print PDF"}</button>{isAdmin && <button onClick={handleDelete} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"><Trash2 size={14}/>{deleting ? "Deleting..." : "Delete"}</button>}</div>
              </div>
              <div className="relative mt-3 min-h-[420px] flex-1 overflow-auto rounded-xl bg-slate-100 p-2 sm:p-4">
                <div className="mx-auto h-full min-h-[420px] bg-white shadow-md" style={{width:`${zoom}%`, minWidth:"min(100%, 520px)"}}>
                  <iframe title={selected.name} src={previewUrl} className="h-full min-h-[650px] w-full border-0" allow="autoplay"/>
                </div>
              </div>
              <p className="pt-2 text-center text-[10px] text-slate-400">Google Drive PDF preview · Print page ranges from the PDF viewer's print controls where supported.</p>
            </> : <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-sky-50 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white text-sky-600 shadow-sm"><FileText size={30}/></div><h2 className="mt-4 text-lg font-black text-slate-800">Select an application form</h2><p className="mt-1 max-w-sm px-4 text-xs leading-5 text-slate-500">Choose a form from the left panel to preview it here, then download or print it.</p><button onClick={()=>void loadFiles()} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh Forms</button></div>}
          </section>
        </div>
      </div>

      {uploadOpen && createPortal(<div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-slate-950/45 p-2 backdrop-blur-sm sm:p-4"><div className="my-auto w-full max-w-md rounded-3xl border border-white bg-white p-3 shadow-2xl sm:p-4"><div className="flex items-center justify-between"><div><h2 className="text-base font-black text-slate-800">Upload Application Form</h2><p className="mt-0.5 text-[11px] text-slate-500">Choose department, office and PDF.</p></div><button onClick={()=>setUploadOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18}/></button></div><div className="mt-2 space-y-2"><label className="block text-xs font-bold text-slate-700">1. Department<select value={formDepartment} onChange={e=>setFormDepartment(e.target.value)} className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Search or select department...</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></label><label className="block text-xs font-bold text-slate-700">2. Office<select value={formOffice} onChange={e=>setFormOffice(e.target.value)} disabled={!formDepartment} className="mt-1 w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-normal disabled:bg-slate-100"><option value="">Select office...</option><option>Common Application Forms</option><option>General Office</option><option>Online Services</option></select></label><label className="block text-xs font-bold text-slate-700">Form name<input value={formName} onChange={e=>{setFormName(e.target.value);if(e.target.value.trim())applyFileNameDefaults(e.target.value);}} placeholder="e.g. Income Certificate Application" className="mt-1 w-full rounded-xl border border-sky-200 px-3 py-2 text-sm font-normal"/></label><label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-slate-50 px-3 py-2.5 text-center"><UploadCloud size={22} className="text-slate-400"/><span className="mt-1 text-xs font-bold text-slate-600">{formFile?formFile.name:"Choose PDF file"}</span><span className="mt-1 text-[10px] text-slate-400">PDF only · max 5 MB</span><input type="file" accept="application/pdf,.pdf" onChange={e=>{const file=e.target.files?.[0]||null;setFormFile(file);if(file){const name=file.name.replace(/\.pdf$/i,"").replace(/[_-]+/g," ").trim();setFormName(name);applyFileNameDefaults(name);}}} className="mt-1.5 max-w-full text-xs"/></label><div className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-[10px] leading-4 text-sky-800">Google Drive connect ചെയ്ത ശേഷം PDF ഈ Application Forms ഫോൾഡറിലേക്ക് upload ചെയ്യും.</div><div className="flex justify-end gap-2"><button onClick={()=>setUploadOpen(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button onClick={handleUpload} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60">{uploading ? <LoaderCircle size={14} className="animate-spin"/> : <UploadCloud size={14}/>} {uploading ? "Uploading..." : "Upload"}</button></div></div></div></div>, document.body)}
    </main>
  );
}
