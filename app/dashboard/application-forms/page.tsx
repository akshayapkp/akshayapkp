"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search, RefreshCw, File, FileText, FileSpreadsheet, FileImage, FileArchive,
  Plus, Edit2, Trash2, Bookmark, X, Briefcase, Clock3, LayoutGrid, List,
  ArrowUpDown, ExternalLink, Eye, Download, Filter, Sparkles, Check, Link2
} from "lucide-react";
import { GOOGLE_DRIVE_CONFIG, DRIVE_ENDPOINT } from "@/app/lib/googledrive";
import PDFViewerModal from "./PDFViewerModal";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink: string;
  webContentLink?: string;
  isPinned?: boolean;
}

type FileFilter = "all" | "latest" | "pdf" | "documents" | "images" | "starred";

const isPdf = (file: DriveFile) => file.mimeType?.toLowerCase().includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
const fileCategory = (file: DriveFile) => {
  const type = (file.mimeType || "").toLowerCase();
  if (isPdf(file)) return "PDF";
  if (type.includes("image")) return "Image";
  if (type.includes("spreadsheet") || type.includes("excel") || type.includes("sheet")) return "Spreadsheet";
  if (type.includes("word") || type.includes("document") || /\.(doc|docx|rtf)$/i.test(file.name)) return "Document";
  return "File";
};

export default function ApplicationFormsPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FileFilter>("all");
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortNewest, setSortNewest] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("application/pdf");
  const [formUrl, setFormUrl] = useState("");

  const persistFiles = (updated: DriveFile[]) => {
    setFiles(updated);
    try { localStorage.setItem("managedApplicationFiles", JSON.stringify(updated)); } catch (error) {
      console.error("Unable to save local form settings", error);
    }
  };

  const loadFiles = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch(DRIVE_ENDPOINT(GOOGLE_DRIVE_CONFIG.folderId, GOOGLE_DRIVE_CONFIG.apiKey));
      if (!response.ok) throw new Error("Google Drive could not be reached. Showing saved forms if available.");
      const data = await response.json();
      const driveFiles: DriveFile[] = data.files ?? [];
      let parsedLocal: DriveFile[] = [];
      try {
        const raw = localStorage.getItem("managedApplicationFiles");
        if (raw) parsedLocal = JSON.parse(raw);
      } catch (error) { console.warn("Saved form settings could not be read", error); }
      const merged = driveFiles.map(file => {
        const saved = parsedLocal.find(item => item.id === file.id);
        return saved ? { ...file, isPinned: saved.isPinned, name: saved.name || file.name } : file;
      });
      const extras = parsedLocal.filter(item => !driveFiles.some(file => file.id === item.id));
      setFiles([...extras, ...merged]);
    } catch (error) {
      console.error("Google Drive Error:", error);
      setLoadError("Google Drive could not be refreshed. Saved local entries are shown where available.");
      try {
        const raw = localStorage.getItem("managedApplicationFiles");
        setFiles(raw ? JSON.parse(raw) : []);
      } catch { setFiles([]); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadFiles(); }, []);

  const filteredFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = files.filter(file => {
      const matchesSearch = !term || file.name.toLowerCase().includes(term) || fileCategory(file).toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (activeFilter === "starred") return Boolean(file.isPinned);
      if (activeFilter === "pdf") return isPdf(file);
      if (activeFilter === "images") return fileCategory(file) === "Image";
      if (activeFilter === "documents") return ["Document", "Spreadsheet"].includes(fileCategory(file));
      return true;
    });
    result = [...result].sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      if (activeFilter === "latest" || sortNewest) {
        return new Date(b.modifiedTime || 0).getTime() - new Date(a.modifiedTime || 0).getTime();
      }
      return a.name.localeCompare(b.name);
    });
    return activeFilter === "latest" ? result.slice(0, 12) : result;
  }, [files, search, activeFilter, sortNewest]);

  const counts = useMemo(() => ({
    all: files.length,
    pdf: files.filter(isPdf).length,
    documents: files.filter(file => ["Document", "Spreadsheet"].includes(fileCategory(file))).length,
    images: files.filter(file => fileCategory(file) === "Image").length,
    starred: files.filter(file => file.isPinned).length,
  }), [files]);

  const openAddModal = () => {
    setEditingFileId(null); setFormName(""); setFormType("application/pdf"); setFormUrl(""); setIsModalOpen(true);
  };
  const openEditModal = (event: React.MouseEvent, file: DriveFile) => {
    event.stopPropagation(); setEditingFileId(file.id); setFormName(file.name); setFormType(file.mimeType); setFormUrl(file.webViewLink || ""); setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditingFileId(null); };
  const handleSaveForm = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formName.trim()) { alert("Please enter a form name."); return; }
    if (!formUrl.trim() || !/^https?:\/\//i.test(formUrl.trim())) {
      alert("Please enter a valid Google Drive or web link. This form adds a link; it does not upload a file to Google Drive.");
      return;
    }
    let updated: DriveFile[];
    if (editingFileId) {
      updated = files.map(file => file.id === editingFileId ? { ...file, name: formName.trim(), mimeType: formType, webViewLink: formUrl.trim() } : file);
    } else {
      updated = [{ id: `link-${Date.now()}`, name: formName.trim(), mimeType: formType, size: undefined, modifiedTime: new Date().toISOString(), webViewLink: formUrl.trim(), isPinned: false }, ...files];
    }
    persistFiles(updated); closeModal();
  };
  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    if (confirm("Remove this form from the list? This will not delete the original Google Drive file.")) persistFiles(files.filter(file => file.id !== id));
  };
  const handleTogglePin = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    persistFiles(files.map(file => file.id === id ? { ...file, isPinned: !file.isPinned } : file));
  };
  const openPreview = (file: DriveFile) => {
    setSelectedFile(file);
    if (isPdf(file) && !file.id.startsWith("link-")) setViewerOpen(true);
    else if (file.webViewLink && file.webViewLink !== "#") window.open(file.webViewLink, "_blank", "noopener,noreferrer");
    else setViewerOpen(true);
  };
  const formatSize = (size?: string) => {
    if (!size) return "Link";
    const bytes = Number(size);
    if (!Number.isFinite(bytes)) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const getIcon = (file: DriveFile, size = 26) => {
    const type = (file.mimeType || "").toLowerCase();
    if (isPdf(file)) return <FileText size={size} className="text-rose-500" />;
    if (type.includes("word") || type.includes("document")) return <FileText size={size} className="text-blue-600" />;
    if (type.includes("sheet") || type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet size={size} className="text-emerald-600" />;
    if (type.includes("image")) return <FileImage size={size} className="text-violet-500" />;
    return <FileArchive size={size} className="text-slate-500" />;
  };
  const filters: { id: FileFilter; label: string; count?: number }[] = [
    { id: "all", label: "All forms", count: counts.all },
    { id: "latest", label: "Latest" },
    { id: "pdf", label: "PDF files", count: counts.pdf },
    { id: "documents", label: "Documents", count: counts.documents },
    { id: "images", label: "Images", count: counts.images },
    { id: "starred", label: "Starred", count: counts.starred },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="relative isolate overflow-hidden rounded-[30px] border border-white bg-gradient-to-br from-[#102a56] via-[#174b76] to-[#087f8c] p-6 text-white shadow-[0_20px_60px_rgba(16,42,86,.18)] sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-blue-300/15 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-cyan-50 backdrop-blur">
                <Sparkles size={14} /> AKSHAYA CENTER POOKIPARAMBA
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Application Forms Vault</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Find, preview and organize your service forms in one place.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/90">
                <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.all} forms available</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.pdf} PDF documents</span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.starred} starred</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void loadFiles()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold transition hover:bg-white/20">
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={openAddModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#123b65] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
                <Plus size={17} /> Add form link
              </button>
            </div>
          </div>
        </section>

        {loadError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</div>}

        <section className="rounded-3xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by form name or file type..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-500/10" />
              {search && <button aria-label="Clear search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200"><X size={15} /></button>}
            </div>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setSortNewest(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"><ArrowUpDown size={15} /> {sortNewest ? "Newest first" : "Name A–Z"}</button>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button aria-label="Grid view" onClick={() => setViewMode("grid")} className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-400"}`}><LayoutGrid size={17} /></button>
                <button aria-label="List view" onClick={() => setViewMode("list")} className={`rounded-lg p-2 ${viewMode === "list" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-400"}`}><List size={17} /></button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {filters.map(filter => (
              <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${activeFilter === filter.id ? "bg-[#143f68] text-white shadow-md shadow-blue-900/10" : "border border-slate-200 bg-white text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"}`}>
                {filter.id === "latest" && <Clock3 size={14} />}
                {filter.id === "starred" && <Bookmark size={14} />}
                {filter.label}
                {filter.count !== undefined && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeFilter === filter.id ? "bg-white/15" : "bg-slate-100"}`}>{filter.count}</span>}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{filters.find(filter => filter.id === activeFilter)?.label}</h2>
              <p className="mt-0.5 text-xs text-slate-500">{filteredFiles.length} result{filteredFiles.length === 1 ? "" : "s"}{search ? ` for “${search}”` : ""}</p>
            </div>
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:inline-flex"><Filter size={14} /> Filter and organize</span>
          </div>
          {loading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"}`}>
              {[1, 2, 3, 4, 5, 6].map(item => <div key={item} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white" />)}
            </div>
          ) : filteredFiles.length ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "grid-cols-1"}`}>
              {filteredFiles.map(file => (
                <article key={file.id} className={`group relative overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 ${file.isPinned ? "border-cyan-300 ring-1 ring-cyan-100" : "border-slate-200/80"} ${viewMode === "list" ? "flex flex-col sm:flex-row sm:items-center" : "flex min-h-[220px] flex-col"}`}>
                  {viewMode === "grid" ? (
                    <>
                      <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50/70">
                        <div className="rounded-2xl border border-white bg-white p-4 shadow-sm transition group-hover:scale-105">{getIcon(file, 34)}</div>
                        <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-extrabold text-slate-500">{fileCategory(file)}</span>
                        <button aria-label={file.isPinned ? "Remove from starred" : "Add to starred"} title={file.isPinned ? "Unstar form" : "Star form"} onClick={event => handleTogglePin(event, file.id)} className={`absolute right-3 top-3 rounded-xl p-2 transition ${file.isPinned ? "bg-amber-100 text-amber-600" : "bg-white/80 text-slate-400 hover:text-amber-500"}`}><Bookmark size={15} fill={file.isPinned ? "currentColor" : "none"} /></button>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h3 title={file.name} className="line-clamp-2 min-h-10 break-words text-sm font-extrabold leading-5 text-slate-800">{file.name}</h3>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400"><span>{formatSize(file.size)}</span><span>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable"}</span></div>
                        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                          <button onClick={() => openPreview(file)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#143f68] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-cyan-800"><Eye size={14} /> Open form</button>
                          <button title="Edit form details" onClick={event => openEditModal(event, file)} className="rounded-xl border border-slate-200 p-2.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"><Edit2 size={15} /></button>
                          <button title="Remove from list" onClick={event => handleDelete(event, file.id)} className="rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 p-4 sm:min-w-0 sm:flex-1">
                        <div className="rounded-2xl bg-slate-50 p-3">{getIcon(file, 27)}</div>
                        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold text-slate-800">{file.name}</h3><p className="mt-1 text-xs text-slate-500">{fileCategory(file)} · {formatSize(file.size)} · {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString("en-IN") : "Date unavailable"}</p></div>
                        <button aria-label="Toggle starred" onClick={event => handleTogglePin(event, file.id)} className={`rounded-xl p-2 ${file.isPinned ? "text-amber-500" : "text-slate-300 hover:text-amber-500"}`}><Bookmark size={17} fill={file.isPinned ? "currentColor" : "none"} /></button>
                      </div>
                      <div className="flex gap-2 border-t border-slate-100 p-3 sm:border-l sm:border-t-0"><button onClick={() => openPreview(file)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#143f68] px-3 py-2.5 text-xs font-bold text-white"><Eye size={14} /> Open</button><button onClick={event => openEditModal(event, file)} aria-label="Edit form" className="rounded-xl border border-slate-200 p-2.5 text-slate-500"><Edit2 size={15} /></button><button onClick={event => handleDelete(event, file.id)} aria-label="Remove form" className="rounded-xl border border-slate-200 p-2.5 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button></div>
                    </>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700"><File size={28} /></div>
              <h3 className="mt-4 text-base font-extrabold text-slate-800">No forms found</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">Try another search, choose a different category, or add a link to a form.</p>
              <button onClick={() => { setSearch(""); setActiveFilter("all"); }} className="mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Clear filters</button>
            </div>
          )}
        </section>
        <p className="pb-4 text-center text-[11px] text-slate-400">Google Drive files stay in Drive. Starred items and added links are saved in this browser.</p>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-white bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
              <div><p className="text-xs font-extrabold uppercase tracking-widest text-cyan-700">{editingFileId ? "Edit details" : "Add to vault"}</p><h3 className="mt-1 text-xl font-black text-slate-900">{editingFileId ? "Edit form link" : "Add a form link"}</h3></div>
              <button onClick={closeModal} aria-label="Close dialog" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <form onSubmit={handleSaveForm} className="space-y-4 p-5 sm:p-6">
              <div><label className="mb-1.5 block text-xs font-bold text-slate-700">Form name *</label><input autoFocus required value={formName} onChange={event => setFormName(event.target.value)} placeholder="e.g. Income Certificate Application" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" /></div>
              <div><label className="mb-1.5 block text-xs font-bold text-slate-700">File type</label><select value={formType} onChange={event => setFormType(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-cyan-500"><option value="application/pdf">PDF document</option><option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word document (.docx)</option><option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel spreadsheet (.xlsx)</option><option value="image/png">Image file</option><option value="text/html">Web form / website</option></select></div>
              <div><label className="mb-1.5 block text-xs font-bold text-slate-700">Google Drive or web URL *</label><div className="relative"><Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="url" value={formUrl} onChange={event => setFormUrl(event.target.value)} placeholder="https://drive.google.com/..." className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3.5 text-sm outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" /></div></div>
              <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-800">This adds a link to the vault; it does not upload a local file or delete the original from Google Drive.</div>
              <div className="flex gap-3 pt-1"><button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-cyan-700 to-blue-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-900/10 hover:brightness-110">{editingFileId ? "Save changes" : "Add link"}</button></div>
            </form>
          </div>
        </div>
      )}
      <PDFViewerModal open={viewerOpen} title={selectedFile?.name || ""} fileId={selectedFile?.id || ""} fileUrl={selectedFile?.webViewLink} onClose={() => { setViewerOpen(false); setSelectedFile(null); }} />
    </main>
  );
}
