"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ImagePlus, Palette, Save, Settings2, Trash2, Upload, X, UsersRound, ShieldCheck, Home, LayoutGrid, FileCog } from "lucide-react";
import { useRouter } from "next/navigation";

const ROW_ID = 999999;
const STORAGE_KEY = "__smart_akshaya_shared_storage__";

type ServiceItem = { id?: string; name?: string; title?: string; serviceName?: string };
type Poster = { id: string; title: string; subtitle: string; image: string; serviceName: string; apply: boolean };
type ServiceConfig = { fields: string[]; documents: string[] };

const FIELD_OPTIONS = [
  ["name","പേര്"],["mobile","മൊബൈൽ നമ്പർ"],["address","വിലാസം"],["dob","ജനന തീയതി"],
  ["aadhaar","ആധാർ നമ്പർ"],["parentName","രക്ഷിതാവിന്റെ പേര്"]
] as const;

const DEFAULT_SETTINGS = {
  contact: { email: "", mobile: "", mobile2: "", whatsapp: "", address: "" },
  theme: { primary: "#155eef", accent: "#06b6d4", background: "#f7fbff" },
  posters: [] as Poster[],
  serviceConfigs: {} as Record<string, ServiceConfig>,
};

function serviceName(s: ServiceItem) {
  return String(s.name || s.title || s.serviceName || "").trim();
}

async function readShared() {
  const { data, error } = await supabase.from("feature_permissions").select("permissions").eq("id", ROW_ID).maybeSingle();
  if (error) throw error;
  const permissions = data?.permissions && typeof data.permissions === "object" ? data.permissions : { storageKey: STORAGE_KEY, data: {} };
  return permissions;
}

export default function SettingsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"overview"|"home"|"posters"|"forms"|"appearance">("overview");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [selectedService, setSelectedService] = useState("");
  const [newDoc, setNewDoc] = useState("");
  const [poster, setPoster] = useState({ title:"", subtitle:"", serviceName:"", image:"", apply:true });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("loggedInUser") || "{}");
    const admin = String(user.role || "").toLowerCase() === "admin";
    setIsAdmin(admin);
    setAuthChecked(true);
    if (!admin) { router.replace("/dashboard"); return; }

    (async () => {
      try {
        const permissions = await readShared();
        const data = permissions?.data || {};
        const saved = data.homepageSettings || {};
        setSettings({
          ...DEFAULT_SETTINGS,
          ...saved,
          contact: { ...DEFAULT_SETTINGS.contact, ...(saved.contact || {}) },
          theme: { ...DEFAULT_SETTINGS.theme, ...(saved.theme || {}) },
          posters: Array.isArray(saved.posters) ? saved.posters : [],
          serviceConfigs: saved.serviceConfigs || {},
        });
        const managed = Array.isArray(data.managedServices) ? data.managedServices : [];
        if (managed.length) setServices(managed.filter((s: ServiceItem) => serviceName(s)));
        else {
          const local = JSON.parse(localStorage.getItem("managedServices") || "[]");
          setServices(Array.isArray(local) ? local.filter((s: ServiceItem) => serviceName(s)) : []);
        }
      } catch (e) {
        console.error(e);
        setMessage("Settings load ചെയ്യാൻ കഴിഞ്ഞില്ല.");
      }
    })();
  }, [router]);

  const selectedConfig = settings.serviceConfigs[selectedService] || { fields:["name","mobile","address"], documents:[] };

  async function saveSettings(next = settings) {
    setSaving(true); setMessage("");
    try {
      const permissions = await readShared();
      const updated = {
        storageKey: permissions.storageKey || STORAGE_KEY,
        data: { ...(permissions.data || {}), homepageSettings: next },
      };
      const { error } = await supabase.from("feature_permissions").upsert(
        { id: ROW_ID, permissions: updated, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      localStorage.setItem("homepageSettings", JSON.stringify(next));
      setSettings(next);
      setMessage("Settings saved successfully.");
    } catch (e) {
      console.error(e); setMessage("Settings save ചെയ്യാൻ കഴിഞ്ഞില്ല.");
    } finally { setSaving(false); }
  }

  function updateContact(key: keyof typeof settings.contact, value: string) {
    setSettings(s => ({ ...s, contact: { ...s.contact, [key]: value } }));
  }

  async function handlePosterFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Image file മാത്രം upload ചെയ്യുക."); return; }
    const reader = new FileReader();
    reader.onload = () => setPoster(p => ({ ...p, image: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  function addPoster() {
    if (!poster.title.trim() || !poster.image) { setMessage("Poster title, image എന്നിവ നൽകുക."); return; }
    const nextPoster: Poster = { ...poster, id: crypto.randomUUID(), title: poster.title.trim(), subtitle: poster.subtitle.trim(), serviceName: poster.serviceName, apply: poster.apply };
    setSettings(s => ({ ...s, posters: [nextPoster, ...s.posters] }));
    setPoster({ title:"", subtitle:"", serviceName:"", image:"", apply:true });
    setMessage("Poster added. Save Settings അമർത്തുക.");
  }

  function toggleField(field: string) {
    const current = selectedConfig.fields.includes(field);
    const fields = current ? selectedConfig.fields.filter(f => f !== field) : [...selectedConfig.fields, field];
    setSettings(s => ({ ...s, serviceConfigs: { ...s.serviceConfigs, [selectedService]: { ...selectedConfig, fields } } }));
  }

  function addDocument() {
    const doc = newDoc.trim();
    if (!selectedService || !doc) return;
    if (selectedConfig.documents.includes(doc)) return;
    setSettings(s => ({ ...s, serviceConfigs: { ...s.serviceConfigs, [selectedService]: { ...selectedConfig, documents: [...selectedConfig.documents, doc] } } }));
    setNewDoc("");
  }

  function removeDocument(doc: string) {
    setSettings(s => ({ ...s, serviceConfigs: { ...s.serviceConfigs, [selectedService]: { ...selectedConfig, documents: selectedConfig.documents.filter(d => d !== doc) } } }));
  }

  if (!authChecked || !isAdmin) return <main className="min-h-screen bg-slate-50 p-8" />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700"><Settings2 size={13}/> Settings</div>
            <h1 className="mt-2 text-3xl font-black text-slate-900">Website & Service Settings</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">Homepage, posters, service forms, contact details and theme — Admin only.</p>
          </div>
          {tab !== "overview" && <button onClick={() => setTab("overview")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><ArrowLeft size={16}/> All Settings</button>}
        </div>

        <div className="grid gap-5 lg:grid-cols-[250px_1fr]">
          {tab === "overview" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["home","Customer Homepage","Homepage, contact numbers, email, address","Homepage settings",Home,"cyan"],
                ["staff","Staff Management","Staff accounts, roles, salary and login","Open staff settings",UsersRound,"violet"],
                ["permissions","Feature Permissions","Staff / Accountant feature access","Open access settings",ShieldCheck,"amber"],
                ["posters","Posters & Notices","Homepage posters and new service notices","Manage posters",ImagePlus,"pink"],
                ["forms","Service Forms","Customer fields and required documents","Manage service forms",FileCog,"blue"],
                ["appearance","Appearance","Homepage colours and visual theme","Customize theme",Palette,"emerald"],
              ].map(([key,title,desc,sub,Icon,tone]) => (
                <button
                  key={String(key)}
                  type="button"
                  onClick={() => {
                    if (key === "staff") router.push("/dashboard/staff-management");
                    else if (key === "permissions") router.push("/dashboard/feature-permissions");
                    else setTab(key as any);
                  }}
                  className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 transition group-hover:bg-cyan-50 group-hover:text-cyan-700"><Icon size={22}/></div>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Settings</span>
                  </div>
                  <h2 className="mt-5 text-lg font-black text-slate-900">{String(title)}</h2>
                  <p className="mt-1 min-h-10 text-xs font-medium leading-5 text-slate-500">{String(desc)}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-black text-cyan-700">{String(sub)} <span className="transition group-hover:translate-x-1">→</span></div>
                </button>
              ))}
            </div>
          ) : (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

            {tab==="home" && (
              <div>
                <h2 className="text-xl font-black text-slate-900">Customer Homepage</h2>
                <p className="mt-1 text-sm text-slate-500">Homepage-ൽ കാണിക്കേണ്ട contact details ഇവിടെ update ചെയ്യാം.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ["email","Email ID","example@email.com"],["mobile","Mobile Number 1","+91 98XXXXXXXX"],["mobile2","Mobile Number 2","+91 98XXXXXXXX"],["whatsapp","WhatsApp Number","+91 98XXXXXXXX"],["address","Address","Akshaya Centre, Pookiparamba"]
                  ].map(([key,label,placeholder]) => (
                    <label key={key} className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
                      <input value={(settings.contact as any)[key] || ""} onChange={e => updateContact(key as any,e.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold outline-none focus:border-cyan-400 focus:bg-white"/>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tab==="posters" && (
              <div>
                <h2 className="text-xl font-black text-slate-900">New Services & Notices</h2>
                <p className="mt-1 text-sm text-slate-500">Poster upload ചെയ്ത് ഏത് service-ലേക്ക് Apply button പോകണം എന്ന് തിരഞ്ഞെടുക്കാം.</p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <input value={poster.title} onChange={e=>setPoster(p=>({...p,title:e.target.value}))} placeholder="Poster title (ഉദാ: Scholarship)" className="rounded-2xl border p-3.5"/>
                  <input value={poster.subtitle} onChange={e=>setPoster(p=>({...p,subtitle:e.target.value}))} placeholder="Short description" className="rounded-2xl border p-3.5"/>
                  <select value={poster.serviceName} onChange={e=>setPoster(p=>({...p,serviceName:e.target.value}))} className="rounded-2xl border p-3.5 md:col-span-2">
                    <option value="">Service select ചെയ്യുക (optional)</option>
                    {services.map(s=><option key={serviceName(s)} value={serviceName(s)}>{serviceName(s)}</option>)}
                  </select>
                  <label className="md:col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-8 text-sm font-black text-cyan-700">
                    <ImagePlus size={20}/> {poster.image ? "Poster selected ✓" : "Poster image upload ചെയ്യുക"}
                    <input type="file" accept="image/*" className="hidden" onChange={e=>handlePosterFile(e.target.files?.[0])}/>
                  </label>
                  {poster.image && <img src={poster.image} alt="Poster preview" className="max-h-64 w-full rounded-2xl object-contain bg-slate-100 md:col-span-2"/>}
                  <button onClick={addPoster} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-black text-white"><ImagePlus size={17}/> Add Poster</button>
                </div>
                <div className="mt-8 space-y-3">
                  {settings.posters.map(p=>(
                    <div key={p.id} className="flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center">
                      <img src={p.image} alt={p.title} className="h-20 w-32 rounded-xl object-cover bg-slate-100"/>
                      <div className="min-w-0 flex-1"><b className="block truncate">{p.title}</b><span className="text-xs text-slate-500">{p.serviceName || "No Apply service"}</span></div>
                      <button onClick={()=>setSettings(s=>({...s,posters:s.posters.filter(x=>x.id!==p.id)}))} className="rounded-xl p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={17}/></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab==="forms" && (
              <div>
                <h2 className="text-xl font-black text-slate-900">Service Request Form</h2>
                <p className="mt-1 text-sm text-slate-500">ഓരോ service-ക്കും customer form-ൽ വേണ്ട വിവരങ്ങളും ആവശ്യമായ രേഖകളും set ചെയ്യാം.</p>
                <select value={selectedService} onChange={e=>setSelectedService(e.target.value)} className="mt-6 w-full rounded-2xl border p-3.5">
                  <option value="">Service select ചെയ്യുക</option>
                  {services.map(s=><option key={serviceName(s)} value={serviceName(s)}>{serviceName(s)}</option>)}
                </select>
                {selectedService && (
                  <div className="mt-5 space-y-6">
                    <div>
                      <h3 className="font-black text-slate-800">Customer Information</h3>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {FIELD_OPTIONS.map(([key,label])=>(
                          <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border bg-slate-50 px-4 py-3">
                            <input type="checkbox" checked={selectedConfig.fields.includes(key)} onChange={()=>toggleField(key)} className="h-4 w-4"/>
                            <span className="text-sm font-bold">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800">Required Documents</h3>
                      <div className="mt-3 flex gap-2">
                        <input value={newDoc} onChange={e=>setNewDoc(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addDocument();}}} placeholder="ഉദാ: Aadhaar copy, Photo..." className="flex-1 rounded-xl border p-3"/>
                        <button onClick={addDocument} className="rounded-xl bg-cyan-600 px-5 font-black text-white">Add</button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedConfig.documents.map(doc=><span key={doc} className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-800">{doc}<button onClick={()=>removeDocument(doc)}><X size={13}/></button></span>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab==="appearance" && (
              <div>
                <h2 className="text-xl font-black text-slate-900">Appearance</h2>
                <p className="mt-1 text-sm text-slate-500">Customer homepage color theme.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  {[
                    ["primary","Primary"],["accent","Accent"],["background","Background"]
                  ].map(([key,label])=>(
                    <label key={key} className="rounded-2xl border p-4"><span className="mb-2 block text-xs font-black">{label}</span><div className="flex gap-2"><input type="color" value={(settings.theme as any)[key]} onChange={e=>setSettings(s=>({...s,theme:{...s.theme,[key]:e.target.value}}))} className="h-10 w-14"/><input value={(settings.theme as any)[key]} onChange={e=>setSettings(s=>({...s,theme:{...s.theme,[key]:e.target.value}}))} className="min-w-0 flex-1 rounded-xl border px-3"/></div></label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4 border-t pt-5">
              {message ? <p className="text-sm font-bold text-cyan-700">{message}</p> : <span/>}
              <button disabled={saving} onClick={()=>saveSettings()} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-3.5 text-sm font-black text-white shadow-lg disabled:opacity-60"><Save size={17}/>{saving ? "Saving..." : "Save Settings"}</button>
            </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
