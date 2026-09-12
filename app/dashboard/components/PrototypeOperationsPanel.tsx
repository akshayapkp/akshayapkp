"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardList, FileBarChart, History, IndianRupee, Search, Users } from "lucide-react";

const checklist = ["Customer identity verified", "Required documents checked", "Payment method confirmed", "Receipt shared with customer"];
const demoServices = [
  { name: "Aadhaar Update", count: 18, amount: 4860 },
  { name: "Passport Photo", count: 14, amount: 2100 },
  { name: "Certificate Application", count: 9, amount: 3150 },
  { name: "Printing & Scanning", count: 27, amount: 1890 },
];

export default function PrototypeOperationsPanel() {
  const [checked, setChecked] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filteredServices = useMemo(
    () => demoServices.filter((service) => service.name.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  const toggleChecklist = (item: string) => {
    setChecked((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  };

  return (
    <section className="grid gap-3 xl:grid-cols-[1.1fr_1fr_1fr]" aria-label="Operations prototype">
      <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Prototype bundle</p>
            <h3 className="mt-1 text-base font-black text-slate-800">Today&apos;s closing</h3>
            <p className="mt-1 text-xs text-slate-500">A faster view of the work that matters today.</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600"><FileBarChart size={19} /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {([
            ['Collection', '₹12,000', IndianRupee],
            ['Bills', '68', ClipboardList],
            ['Customers', '42', Users],
            ['Pending', '₹1,850', History],
          ] as const).map(([label, value, Icon]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <div className="flex items-center justify-between text-slate-400"><span className="text-[10px] font-bold uppercase tracking-wide">{label}</span><Icon size={14} /></div>
              <p className="mt-2 text-lg font-black text-slate-800">{value}</p>
            </div>
          ))}
        </div>
        <Link href="/dashboard/transaction-history" className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-blue-900">
          Open full reports <ArrowRight size={15} />
        </Link>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Service insights</p><h3 className="mt-1 text-base font-black text-slate-800">Top services</h3></div><Link href="/dashboard/billed-services" className="text-xs font-bold text-blue-600">View all</Link></div>
        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"><Search size={15} className="text-slate-400" /><span className="sr-only">Filter services</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter services" className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /></label>
        <div className="mt-3 flex flex-col gap-2">{filteredServices.map((service) => <div key={service.name} className="flex items-center justify-between rounded-2xl border border-slate-100 px-3 py-2.5"><div><p className="text-xs font-bold text-slate-700">{service.name}</p><p className="text-[10px] text-slate-400">{service.count} completed</p></div><p className="text-xs font-black text-emerald-600">₹{service.amount.toLocaleString("en-IN")}</p></div>)}</div>
      </div>

      <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Service entry helper</p><h3 className="mt-1 text-base font-black text-slate-800">Document checklist</h3></div><div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600"><ClipboardList size={19} /></div></div>
        <p className="mt-1 text-xs text-slate-500">Use this quick checklist before closing a customer bill.</p>
        <div className="mt-4 flex flex-col gap-2">{checklist.map((item) => { const isChecked = checked.includes(item); return <button type="button" key={item} onClick={() => toggleChecklist(item)} className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold transition ${isChecked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-violet-200"}`}><CheckCircle2 size={16} className={isChecked ? "text-emerald-600" : "text-slate-300"} />{item}</button>; })}</div>
        <Link href="/dashboard/service-entry" className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs font-bold text-violet-700 transition hover:-translate-y-0.5 hover:bg-violet-100">Start service entry <ArrowRight size={15} /></Link>
      </div>
    </section>
  );
}
