"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileText, MapPin, MessageCircle, Phone, Search, ShieldCheck, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import styles from "./home.module.css";

type ServiceItem = {
  id?: string;
  name?: string;
  title?: string;
  serviceName?: string;
  wallet?: string;
  portalUrl?: string;
  note?: string;
};

type FieldKey = "name" | "mobile" | "address" | "dob" | "aadhaar" | "parentName";

const CENTRAL_STORAGE_ROW_ID = 999999;
const CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";

const iconFor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("aadhaar") || n.includes("aadhar")) return "🪪";
  if (n.includes("pan")) return "💳";
  if (n.includes("passport")) return "🛂";
  if (n.includes("certificate")) return "📜";
  if (n.includes("ration")) return "🍚";
  if (n.includes("driving") || n.includes("licence") || n.includes("license")) return "🚘";
  if (n.includes("scholarship") || n.includes("exam") || n.includes("psc") || n.includes("neet") || n.includes("keam")) return "🎓";
  if (n.includes("bill") || n.includes("recharge")) return "💳";
  return "📄";
};

const serviceName = (s: ServiceItem) => String(s.name || s.title || s.serviceName || "").trim();

function getFlow(name: string): { audiences: string[]; fields: FieldKey[]; docs: string[] } {
  const n = name.toLowerCase();
  if (n.includes("aadhaar")) {
    const child = n.includes("child") || n.includes("minor");
    return {
      audiences: child ? ["കുട്ടി"] : ["കുട്ടി", "മുതിർന്നവർ"],
      fields: ["name", "mobile", "address", "dob", "aadhaar", "parentName"],
      docs: ["ആധാർ കാർഡ് / ആധാർ എൻറോൾമെന്റ് വിവരങ്ങൾ", "വിലാസം തെളിയിക്കുന്ന രേഖ (ആവശ്യമായാൽ)", "കുട്ടിയാണെങ്കിൽ ജനന സർട്ടിഫിക്കറ്റ് / രക്ഷിതാവിന്റെ ആധാർ", "ബന്ധപ്പെട്ട supporting document"],
    };
  }
  if (n.includes("pan")) return {
    audiences: ["വ്യക്തി", "കുട്ടി / Minor"],
    fields: ["name", "mobile", "address", "dob", "aadhaar"],
    docs: ["ആധാർ കാർഡ്", "ജനന തീയതി തെളിയിക്കുന്ന രേഖ", "ഫോട്ടോ / supporting document (ആവശ്യമായാൽ)"],
  };
  if (n.includes("passport")) return {
    audiences: ["വ്യക്തി", "കുട്ടി / Minor"],
    fields: ["name", "mobile", "address", "dob"],
    docs: ["ആധാർ / തിരിച്ചറിയൽ രേഖ", "വിലാസം തെളിയിക്കുന്ന രേഖ", "ജനന തീയതി തെളിയിക്കുന്ന രേഖ", "പഴയ പാസ്‌പോർട്ട് (renewal ആണെങ്കിൽ)"],
  };
  if (n.includes("certificate")) return {
    audiences: ["വ്യക്തി", "കുട്ടി / Minor"],
    fields: ["name", "mobile", "address", "dob"],
    docs: ["ആധാർ / തിരിച്ചറിയൽ രേഖ", "വിലാസം തെളിയിക്കുന്ന രേഖ", "സേവനത്തിന് ആവശ്യമായ supporting document"],
  };
  if (n.includes("ration")) return {
    audiences: ["കുടുംബം", "വ്യക്തി"],
    fields: ["name", "mobile", "address"],
    docs: ["റേഷൻ കാർഡ്", "ആധാർ രേഖകൾ", "വിലാസം തെളിയിക്കുന്ന രേഖ", "ബന്ധപ്പെട്ട supporting document"],
  };
  return {
    audiences: ["വ്യക്തി", "കുട്ടി / Minor", "മറ്റുള്ളവർ"],
    fields: ["name", "mobile", "address"],
    docs: ["ആധാർ / തിരിച്ചറിയൽ രേഖ", "ആവശ്യമായ supporting document", "സേവനത്തിന് ബാധകമായ മറ്റ് രേഖകൾ"],
  };
}

export default function HomePage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [audience, setAudience] = useState("");
  const [form, setForm] = useState<Record<FieldKey, string>>({ name: "", mobile: "", address: "", dob: "", aadhaar: "", parentName: "" });
  const [files, setFiles] = useState<File[]>([]);

  const whatsappNumber = process.env.NEXT_PUBLIC_AKSHAYA_WHATSAPP || "917XXXXXXXXX";

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      setLoading(true);
      try {
        const local = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("managedServices") || "[]") : [];
        const localList = Array.isArray(local) ? local : [];
        const { data } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).limit(1);
        const payload = data?.[0]?.permissions;
        const central = payload?.storageKey === CENTRAL_STORAGE_KEY && payload?.data?.managedServices;
        const list = Array.isArray(central) && central.length ? central : localList;
        if (!cancelled) setServices(list.filter((s: ServiceItem) => serviceName(s)));
      } catch {
        if (!cancelled) {
          try {
            const local = JSON.parse(localStorage.getItem("managedServices") || "[]");
            setServices(Array.isArray(local) ? local : []);
          } catch { setServices([]); }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadServices();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(s => serviceName(s).toLowerCase().includes(q));
  }, [services, search]);

  const flow = selected ? getFlow(serviceName(selected)) : null;

  function openService(s: ServiceItem) {
    setSelected(s);
    const f = getFlow(serviceName(s));
    setAudience(f.audiences[0] || "");
    setForm({ name: "", mobile: "", address: "", dob: "", aadhaar: "", parentName: "" });
    setFiles([]);
  }

  function closeService() {
    setSelected(null);
    setFiles([]);
  }

  function field(label: string, key: FieldKey, type = "text", placeholder = "") {
    if (!flow?.fields.includes(key)) return null;
    return <label className={styles.formField}><span>{label}</span><input type={type} value={form[key]} placeholder={placeholder} onChange={e => setForm(v => ({ ...v, [key]: e.target.value }))}/></label>;
  }

  function sendToWhatsApp() {
    if (!selected || !flow) return;
    const name = serviceName(selected);
    const lines = [
      "അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പ്",
      "സേവന അപേക്ഷ",
      "--------------------",
      "സേവനം: " + name,
      "ആർക്കായി: " + audience,
      form.name && "പേര്: " + form.name,
      form.mobile && "മൊബൈൽ: " + form.mobile,
      form.address && "വിലാസം: " + form.address,
      form.dob && "ജനന തീയതി: " + form.dob,
      form.aadhaar && "ആധാർ: " + form.aadhaar,
      form.parentName && "രക്ഷിതാവിന്റെ പേര്: " + form.parentName,
      "",
      "തിരഞ്ഞെടുത്ത രേഖകൾ:",
      ...flow.docs.map(d => "• " + d),
      "",
      files.length ? "രേഖകൾ WhatsApp-ൽ attach ചെയ്യുന്നു: " + files.map(f => f.name).join(", ") : "രേഖകൾ WhatsApp-ൽ attach ചെയ്യുന്നതാണ്.",
    ].filter(Boolean).join("\n");
    window.open("https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(lines), "_blank", "noopener,noreferrer");
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.container + " " + styles.headerInner}>
        <Link href="/" className={styles.brand}><img src="/akshaya-logo.png" alt="Akshaya" className={styles.logo}/><div><strong>അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പ്</strong><span>ഡിജിറ്റൽ സേവന കേന്ദ്രം</span></div></Link>
        <nav className={styles.nav}><a href="#services">സേവനങ്ങൾ</a><a href="#status">അപേക്ഷാ സ്റ്റാറ്റസ്</a><a href="#contact">ബന്ധപ്പെടുക</a><Link href="/login" className={styles.loginButton}>Official Login</Link></nav>
      </div>
    </header>

    <section className={styles.hero}>
      <div className={styles.container + " " + styles.heroSingle}>
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><ShieldCheck size={15}/> Customer Portal · കസ്റ്റമർ പോർട്ടൽ</div>
          <h1>സർക്കാർ സേവനങ്ങൾ<br/><span>എളുപ്പത്തിൽ.</span></h1>
          <p>അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പിലൂടെ ആവശ്യമായ സേവനം തിരഞ്ഞെടുക്കൂ. ആവശ്യമായ വിവരങ്ങളും രേഖകളും നൽകി WhatsApp വഴി അപേക്ഷയുടെ തുടർനടപടികൾ പൂർത്തിയാക്കാം.</p>
          <div className={styles.heroActions}><a href="#services" className={styles.primaryButton}>സേവനം തിരഞ്ഞെടുക്കൂ <ArrowRight size={18}/></a><a href="#contact" className={styles.secondaryButton}><MessageCircle size={18}/> WhatsApp സഹായം</a></div>
          <div className={styles.trustRow}><span><CheckCircle2 size={17}/> വ്യക്തിഗത സഹായം</span><span><CheckCircle2 size={17}/> വ്യക്തമായ രേഖാ ലിസ്റ്റ്</span><span><CheckCircle2 size={17}/> വേഗത്തിലുള്ള പിന്തുണ</span></div>
        </div>
      </div>
    </section>

    <section id="services" className={styles.serviceSection}>
      <div className={styles.container}>
        <div className={styles.sectionHeading}><span>Services · സേവനങ്ങൾ</span><h2>ഒരു സേവനം തിരഞ്ഞെടുക്കൂ</h2><p>നിങ്ങളുടെ ആവശ്യമായ സേവനം Search ചെയ്ത് തിരഞ്ഞെടുക്കാം.</p></div>
        <div className={styles.searchBox}><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="സേവനം തിരയുക... / Search service..."/></div>
        {loading ? <div className={styles.emptyState}>സേവനങ്ങളുടെ ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു...</div> : <div className={styles.serviceGrid}>{filtered.map((s, i) => <button key={String(s.id || i)} onClick={() => openService(s)} className={styles.serviceCard}><div className={styles.serviceEmoji}>{iconFor(serviceName(s))}</div><div className={styles.serviceText}><h3>{serviceName(s)}</h3><p>സേവനത്തിന്റെ ആവശ്യകതകളും രേഖകളും കാണാൻ ക്ലിക്ക് ചെയ്യുക</p><span>വിശദാംശങ്ങൾ കാണുക <ArrowRight size={15}/></span></div></button>)}</div>}
        {!loading && filtered.length === 0 && <div className={styles.emptyState}>സേവനം കണ്ടെത്താനായില്ല. മറ്റൊരു പേര് Search ചെയ്യൂ.</div>}
      </div>
    </section>

    <section id="status" className={styles.statusSection}><div className={styles.container}><div className={styles.statusCard}><div><span className={styles.statusBadge}>അപേക്ഷാ സ്റ്റാറ്റസ്</span><h2>അപേക്ഷ എവിടെ എത്തിയെന്ന് അറിയണോ?</h2><p>Application number തയ്യാറാക്കി ഞങ്ങളെ ബന്ധപ്പെടൂ. ആവശ്യമായ status check ചെയ്യാൻ സഹായിക്കാം.</p></div><a href="#contact" className={styles.primaryButton}>സഹായം നേടുക <ArrowRight size={17}/></a></div></div></section>

    <section id="contact" className={styles.infoSection}><div className={styles.container + " " + styles.infoGrid}><div><div className={styles.sectionHeading}><span>Contact · ബന്ധപ്പെടുക</span><h2>അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പ്</h2><p>സേവനം സംബന്ധിച്ച സംശയങ്ങൾക്കായി ഞങ്ങളെ ബന്ധപ്പെടാം.</p></div><div className={styles.points}><div><Phone/><span>WhatsApp / Phone വഴി ബന്ധപ്പെടുക</span></div><div><MapPin/><span>പൂക്കിപ്പറമ്പ്, കേരളം</span></div><div><FileText/><span>ആവശ്യമായ രേഖകൾ സേവനം അനുസരിച്ച് മാറാം.</span></div></div></div><div className={styles.contactCard}><h2>നേരിട്ട് സഹായം വേണോ?</h2><p>നിങ്ങളുടെ സേവനം തിരഞ്ഞെടുക്കൂ, വിവരങ്ങൾ നൽകൂ, തുടർന്ന് WhatsApp വഴി ഞങ്ങളുമായി ബന്ധപ്പെടൂ.</p><a href={"https://wa.me/" + whatsappNumber} target="_blank" rel="noopener noreferrer" className={styles.whatsappButton}><MessageCircle size={20}/> WhatsApp ബന്ധപ്പെടുക</a></div></div></section>

    <footer className={styles.footer}><div className={styles.container + " " + styles.footerInner}><div className={styles.brand}><img src="/akshaya-logo.png" alt="Akshaya" className={styles.logo}/><div><strong>അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പ്</strong><span>ഡിജിറ്റൽ സേവന കേന്ദ്രം</span></div></div><div className={styles.footerLinks}><a href="#services">സേവനങ്ങൾ</a><a href="#status">സ്റ്റാറ്റസ്</a><a href="#contact">ബന്ധപ്പെടുക</a><Link href="/login">Official Login</Link></div></div></footer>

    {selected && flow && <div className={styles.modalOverlay} onMouseDown={e => { if (e.target === e.currentTarget) closeService(); }}>
      <div className={styles.serviceModal}>
        <div className={styles.modalHeader}><div><span>Service Request</span><h2>{serviceName(selected)}</h2></div><button onClick={closeService}><X/></button></div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}><h3>ആർക്കാണ് സേവനം?</h3><div className={styles.choiceGrid}>{flow.audiences.map(a => <button key={a} className={audience === a ? styles.choiceActive : styles.choice} onClick={() => setAudience(a)}>{a}</button>)}</div></div>
          <div className={styles.modalSection}><h3>ആവശ്യമായ രേഖകൾ</h3><div className={styles.documentList}>{flow.docs.map(d => <div key={d}><CheckCircle2 size={16}/><span>{d}</span></div>)}</div><small>കുറിപ്പ്: രേഖകളുടെ അന്തിമ ലിസ്റ്റ് സേവനത്തിന്റെ നിലവിലെ ആവശ്യകത അനുസരിച്ച് കേന്ദ്രം സ്ഥിരീകരിക്കും.</small></div>
          <div className={styles.modalSection}><h3>നിങ്ങളുടെ വിവരങ്ങൾ</h3><div className={styles.formGrid}>{field("പേര്","name","text","പൂർണ്ണ പേര്")}{field("മൊബൈൽ നമ്പർ","mobile","tel","10 അക്ക മൊബൈൽ നമ്പർ")}{field("വിലാസം","address","text","പൂർണ്ണ വിലാസം")}{field("ജനന തീയതി","dob","date")}{field("ആധാർ നമ്പർ","aadhaar","text","12 അക്ക ആധാർ നമ്പർ")}{field("രക്ഷിതാവിന്റെ പേര്","parentName","text","കുട്ടിയാണെങ്കിൽ")}</div></div>
          <div className={styles.modalSection}><h3>രേഖകൾ തിരഞ്ഞെടുക്കുക</h3><label className={styles.uploadBox}><Upload size={22}/><b>Upload Documents</b><span>രേഖകൾ തിരഞ്ഞെടുക്കാൻ ഇവിടെ ക്ലിക്ക് ചെയ്യുക</span><input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))}/></label>{files.length > 0 && <div className={styles.fileList}>{files.map(f => <span key={f.name}>{f.name}</span>)}</div>}</div>
        </div>
        <div className={styles.modalFooter}><button className={styles.secondaryButton} onClick={closeService}>Cancel</button><button className={styles.whatsappButton} onClick={sendToWhatsApp}><MessageCircle size={18}/> WhatsApp-ലേക്ക് തുടരുക</button></div>
      </div>
    </div>}
  </main>;
}
