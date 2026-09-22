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
type CustomerApplication = { applicationNumber: string; service: string; audience: string; customer: Record<string, string>; documentNames: string[]; submittedAt: string; status: string; note?: string; updatedAt?: string; };

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

const serviceCategory = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("aadhaar") || n.includes("aadhar")) return "Aadhaar";
  if (n.includes("pan")) return "PAN";
  if (n.includes("passport")) return "Passport";
  if (n.includes("certificate") || n.includes("birth") || n.includes("death") || n.includes("income") || n.includes("caste") || n.includes("community") || n.includes("residence")) return "Certificates";
  if (n.includes("ration") || n.includes("food card")) return "Ration";
  if (n.includes("driving") || n.includes("licence") || n.includes("license") || n.includes("vehicle") || n.includes("rc")) return "Driving / Vehicle";
  if (n.includes("scholarship") || n.includes("exam") || n.includes("psc") || n.includes("neet") || n.includes("keam") || n.includes("education")) return "Education / Exam";
  if (n.includes("bill") || n.includes("recharge") || n.includes("utility") || n.includes("electricity")) return "Bill / Recharge";
  return "Other";
};

const maskMobile = (mobile: string) => {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!digits) return "—";
  const local = digits.slice(-10);
  const lastThree = local.slice(-3);
  return local.length >= 3 ? `+91 XXX XXX ${lastThree}` : `+91 XXX XXX ${lastThree}`;
};

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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceItem | null>(null);
  const [audience, setAudience] = useState("");
  const [form, setForm] = useState<Record<FieldKey, string>>({ name: "", mobile: "", address: "", dob: "", aadhaar: "", parentName: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [applicationNumber, setApplicationNumber] = useState("");
  const [showApplicationPopup, setShowApplicationPopup] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [statusNumber, setStatusNumber] = useState("");
  const [statusResult, setStatusResult] = useState<CustomerApplication | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

  const categories = useMemo(() => Array.from(new Set(services.map(s => serviceCategory(serviceName(s))))), [services]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter(s => {
      const matchesCategory = !selectedCategory || serviceCategory(serviceName(s)) === selectedCategory;
      const matchesSearch = !q || serviceName(s).toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [services, search, selectedCategory]);

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

  async function submitApplication() {
    if (!selected || !flow) return;
    setSubmitError("");
    if (!audience || !form.name.trim() || !form.mobile.trim()) {
      setSubmitError("ദയവായി ആർക്കാണ് സേവനം, പേര്, മൊബൈൽ നമ്പർ എന്നിവ പൂരിപ്പിക്കുക.");
      return;
    }
    if (files.length === 0) {
      setSubmitError("ദയവായി ആവശ്യമായ രേഖകൾ Upload ചെയ്ത ശേഷം Submit ചെയ്യുക.");
      return;
    }
    try {
      const { data, error } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).maybeSingle();
      if (error) throw error;
      const permissions = data?.permissions && typeof data.permissions === "object" ? data.permissions : { storageKey: CENTRAL_STORAGE_KEY, data: {} };
      const stored = Array.isArray(permissions?.data?.customerApplications) ? permissions.data.customerApplications as CustomerApplication[] : [];
      const used = new Set(stored.map(a => String(a.applicationNumber).padStart(4, "0")));
      let next = 1;
      while (next <= 9999 && used.has(String(next).padStart(4, "0"))) next++;
      if (next > 9999) throw new Error("Application number limit reached.");
      const generated = String(next).padStart(4, "0");
      const application: CustomerApplication = {
        applicationNumber: generated,
        service: serviceName(selected),
        audience,
        customer: { ...form },
        documentNames: files.map(f => f.name),
        submittedAt: new Date().toISOString(),
        status: "Submitted",
      };
      const updatedApplications = [application, ...stored].slice(0, 5000);
      const updatedPermissions = {
        storageKey: permissions.storageKey || CENTRAL_STORAGE_KEY,
        data: { ...(permissions.data || {}), customerApplications: updatedApplications },
      };
      const { error: saveError } = await supabase.from("feature_permissions").upsert(
        { id: CENTRAL_STORAGE_ROW_ID, permissions: updatedPermissions, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (saveError) throw saveError;
      localStorage.setItem("akshaya_customer_applications", JSON.stringify(updatedApplications));
      setApplicationNumber(generated);
      setShowApplicationPopup(true);
    } catch {
      setSubmitError("അപേക്ഷ നമ്പർ സൃഷ്ടിക്കാൻ കഴിഞ്ഞില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും Submit ചെയ്യുക.");
    }
  }

  async function trackApplication() {
    const number = statusNumber.replace(/\D/g, "").slice(0, 4);
    setStatusResult(null);
    setStatusMessage("");
    if (number.length !== 4) {
      setStatusMessage("4 അക്ക അപേക്ഷ നമ്പർ നൽകുക.");
      return;
    }
    setStatusLoading(true);
    try {
      const { data, error } = await supabase.from("feature_permissions").select("permissions").eq("id", CENTRAL_STORAGE_ROW_ID).maybeSingle();
      if (error) throw error;
      const stored = Array.isArray(data?.permissions?.data?.customerApplications) ? data.permissions.data.customerApplications as CustomerApplication[] : [];
      const found = stored.find(a => String(a.applicationNumber).padStart(4, "0") === number);
      if (found) setStatusResult(found);
      else setStatusMessage("ഈ അപേക്ഷ നമ്പർ കണ്ടെത്താനായില്ല.");
    } catch {
      setStatusMessage("Status പരിശോധിക്കാൻ ഇപ്പോൾ സാധിക്കുന്നില്ല. കുറച്ച് കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.");
    } finally {
      setStatusLoading(false);
    }
  }

  function openApplicationWhatsApp() {
    if (!selected || !flow || !applicationNumber) return;
    const lines = [
      "അക്ഷയ സെന്റർ പൂക്കിപ്പറമ്പ്",
      "പുതിയ സേവന അപേക്ഷ",
      "--------------------",
      "അപേക്ഷ നമ്പർ: " + applicationNumber,
      "സേവനം: " + serviceName(selected),
      "ആർക്കായി: " + audience,
      form.name && "പേര്: " + form.name,
      form.mobile && "മൊബൈൽ: " + form.mobile,
      form.address && "വിലാസം: " + form.address,
      form.dob && "ജനന തീയതി: " + form.dob,
      form.aadhaar && "ആധാർ: " + form.aadhaar,
      form.parentName && "രക്ഷിതാവിന്റെ പേര്: " + form.parentName,
      "",
      "Upload ചെയ്യേണ്ട രേഖകൾ:",
      ...files.map(f => "• " + f.name),
      "",
      "ഈ അപേക്ഷയുടെ രേഖകൾ WhatsApp-ൽ attach ചെയ്ത് അയയ്ക്കുന്നു.",
    ].filter(Boolean).join("\n");
    window.open("https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(lines), "_blank", "noopener,noreferrer");
  }

  function closeApplicationPopup() {
    setShowApplicationPopup(false);
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
        <div className={styles.serviceToolbar}>
          <div className={styles.serviceCategoryBar}>
            <button className={!selectedCategory ? styles.categoryButtonActive : styles.categoryButton} onClick={() => setSelectedCategory("")}>All List</button>
            {categories.map(category => <button key={category} className={selectedCategory === category ? styles.categoryButtonActive : styles.categoryButton} onClick={() => setSelectedCategory(category)}>{category}</button>)}
          </div>
          <div className={styles.searchBox}><Search size={19}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="സേവനം തിരയുക... / Search service..."/></div>
        </div>
        {!loading && !selectedCategory && !search && <div className={styles.servicePrompt}><div className={styles.servicePromptIcon}>☰</div><div><strong>Service List</strong><span>ഒരു Category തിരഞ്ഞെടുക്കുക. എല്ലാ സേവനങ്ങളും കാണാൻ <b>All List</b> തിരഞ്ഞെടുക്കാം.</span></div></div>}
        {loading ? <div className={styles.emptyState}>സേവനങ്ങളുടെ ലിസ്റ്റ് ലോഡ് ചെയ്യുന്നു...</div> : (selectedCategory || search) && <div className={styles.serviceGrid}>{filtered.map((s, i) => <button key={String(s.id || i)} onClick={() => openService(s)} className={styles.serviceCard}><div className={styles.serviceEmoji}>{iconFor(serviceName(s))}</div><div className={styles.serviceText}><h3>{serviceName(s)}</h3><p>സേവനത്തിന്റെ ആവശ്യകതകളും രേഖകളും കാണാൻ ക്ലിക്ക് ചെയ്യുക</p><span>വിശദാംശങ്ങൾ കാണുക <ArrowRight size={15}/></span></div></button>)}</div>}
        {!loading && filtered.length === 0 && <div className={styles.emptyState}>സേവനം കണ്ടെത്താനായില്ല. മറ്റൊരു പേര് Search ചെയ്യൂ.</div>}
      </div>
    </section>

    <section id="status" className={styles.statusSection}>
      <div className={styles.container}>
        <div className={styles.statusCard}>
          <div className={styles.statusCopy}>
            <span className={styles.statusBadge}>അപേക്ഷാ സ്റ്റാറ്റസ്</span>
            <h2>അപേക്ഷയുടെ നിലവിലെ സ്ഥിതി അറിയാം</h2>
            <p>നിങ്ങൾക്ക് ലഭിച്ച 4 അക്ക അപേക്ഷ നമ്പർ നൽകൂ. സ്റ്റാഫ് update ചെയ്തിരിക്കുന്ന status ഇവിടെ കാണാം.</p>
            <div className={styles.statusSearch}>
              <input
                inputMode="numeric"
                maxLength={4}
                value={statusNumber}
                onChange={e => setStatusNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="4 അക്ക അപേക്ഷ നമ്പർ"
                onKeyDown={e => { if (e.key === "Enter") trackApplication(); }}
              />
              <button onClick={trackApplication} disabled={statusLoading}>
                {statusLoading ? "തിരയുന്നു..." : "Status നോക്കുക"}
              </button>
            </div>
            {statusMessage && <p className={styles.statusMessage}>{statusMessage}</p>}
            {statusResult && (
              <div className={styles.statusResult}>
                <div><span>അപേക്ഷ നമ്പർ</span><strong>{statusResult.applicationNumber}</strong></div>
                <div><span>പേര്</span><strong>{statusResult.customer?.name || "—"}</strong></div>
                <div><span>മൊബൈൽ</span><strong>{maskMobile(statusResult.customer?.mobile || "")}</strong></div>
                <div><span>സേവനം</span><strong>{statusResult.service}</strong></div>
                <div><span>നിലവിലെ സ്ഥിതി</span><strong className={styles.liveStatus}>{statusResult.status}</strong></div>
                {statusResult.note && (
                  <div className={styles.statusNote}>
                    <span>കുറിപ്പ് / Note</span>
                    <strong>{statusResult.note}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>

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
        <div className={styles.modalFooter}>{submitError && <span className={styles.submitError}>{submitError}</span>}<button className={styles.secondaryButton} onClick={closeService}>Cancel</button><button className={styles.primaryButton} onClick={submitApplication}><CheckCircle2 size={18}/> Submit അപേക്ഷ</button></div>
      </div>
    </div>}


    {showApplicationPopup && selected && <div className={styles.modalOverlay} onMouseDown={e => { if (e.target === e.currentTarget) closeApplicationPopup(); }}>
      <div className={styles.applicationPopup}>
        <div className={styles.successIcon}><CheckCircle2 size={32}/></div>
        <span className={styles.popupEyebrow}>Application Submitted</span>
        <h2>നിങ്ങളുടെ അപേക്ഷ നമ്പർ</h2>
        <div className={styles.applicationNumber}>{applicationNumber}</div>
        <p>ഈ നമ്പർ സൂക്ഷിച്ച് വെക്കുക. അപേക്ഷയുടെ തുടർനടപടികൾക്കും status അറിയാനും ഇത് ആവശ്യമാണ്.</p>
        <div className={styles.applicationSummary}>
          <span>സേവനം</span><strong>{serviceName(selected)}</strong>
          <span>രേഖകൾ</span><strong>{files.length} എണ്ണം</strong>
        </div>
        <button className={styles.whatsappButton} onClick={openApplicationWhatsApp}><MessageCircle size={18}/> WhatsApp-ൽ രേഖകൾ Upload ചെയ്യുക</button>
        <small>WhatsApp തുറന്ന ശേഷം തിരഞ്ഞെടുക്കപ്പെട്ട രേഖകൾ attach ചെയ്ത് അയയ്ക്കുക. അപേക്ഷ നമ്പറും സേവന വിവരവും മെസ്സേജിൽ സ്വയം വരും.</small>
        <button className={styles.popupCloseButton} onClick={closeApplicationPopup}>പിന്നീട് Upload ചെയ്യാം</button>
      </div>
    </div>}  </main>;
}
