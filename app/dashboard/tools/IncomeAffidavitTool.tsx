"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileText, Printer, RotateCcw, X } from "lucide-react";

type IncomeAffidavitToolProps = {
  onClose?: () => void;
};

type AffidavitForm = {
  name: string;
  parentName: string;
  age: string;
  address: string;
  occupation: string;
  annualIncome: string;
  incomeSource: string;
  purpose: string;
  place: string;
  date: string;
  declarant: string;
  witness1: string;
  witness2: string;
};

const initialForm: AffidavitForm = {
  name: "",
  parentName: "",
  age: "",
  address: "",
  occupation: "",
  annualIncome: "",
  incomeSource: "",
  purpose: "",
  place: "",
  date: new Date().toISOString().slice(0, 10),
  declarant: "",
  witness1: "",
  witness2: "",
};

const numberToIndianWords = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) return "";
  if (value === 0) return "Zero Rupees";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const underThousand = (n: number): string => {
    const parts: string[] = [];
    if (n >= 100) {
      parts.push(ones[Math.floor(n / 100)] + " Hundred");
      n %= 100;
    }
    if (n >= 20) {
      parts.push(tens[Math.floor(n / 10)]);
      n %= 10;
    }
    if (n > 0) parts.push(ones[n]);
    return parts.join(" ");
  };

  let n = Math.floor(value);
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  if (crore) {
    parts.push(underThousand(crore) + " Crore");
    n %= 10000000;
  }
  const lakh = Math.floor(n / 100000);
  if (lakh) {
    parts.push(underThousand(lakh) + " Lakh");
    n %= 100000;
  }
  const thousand = Math.floor(n / 1000);
  if (thousand) {
    parts.push(underThousand(thousand) + " Thousand");
    n %= 1000;
  }
  if (n) parts.push(underThousand(n));
  return parts.join(" ") + " Rupees Only";
};

const formatDate = (date: string) => {
  if (!date) return "";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function IncomeAffidavitTool({ onClose }: IncomeAffidavitToolProps) {
  const [form, setForm] = useState<AffidavitForm>(initialForm);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("income_affidavit_draft");
      if (saved) setForm({ ...initialForm, ...JSON.parse(saved) });
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("income_affidavit_draft", JSON.stringify(form));
    } catch {}
  }, [form]);

  const incomeWords = useMemo(
    () => numberToIndianWords(Number(form.annualIncome || 0)),
    [form.annualIncome]
  );

  const update = (key: keyof AffidavitForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const reset = () => {
    setForm({ ...initialForm, date: new Date().toISOString().slice(0, 10) });
    try {
      localStorage.removeItem("income_affidavit_draft");
    } catch {}
  };

  const print = () => window.print();

  return (
    <div className="fixed inset-0 z-[10001] overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-md sm:p-6">
      <div className="mx-auto flex min-h-full w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <FileText size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black">Income Affidavit</h2>
              <p className="text-xs text-blue-200">Create, preview and print an income affidavit</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Close Income Affidavit"
            >
              <X size={19} />
            </button>
          )}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[430px_minmax(0,1fr)]">
          <section className="border-b border-slate-200 bg-white p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4">
              <h3 className="text-sm font-black text-slate-800">Applicant Details</h3>
              <p className="mt-1 text-xs text-slate-500">Enter the details to generate the document.</p>
            </div>

            <div className="space-y-3">
              {[
                ["name", "Applicant Name", "Full name"],
                ["parentName", "Father / Husband / Guardian Name", "Parent or spouse name"],
                ["age", "Age", "e.g. 32"],
                ["occupation", "Occupation", "e.g. Self Employed"],
                ["incomeSource", "Source of Income", "e.g. Business / Salary / Agriculture"],
                ["purpose", "Purpose", "e.g. Scholarship / Education / Government service"],
                ["place", "Place", "e.g. Tirur"],
                ["declarant", "Declarant Name", "Name for signature"],
                ["witness1", "Witness 1", "Optional"],
                ["witness2", "Witness 2", "Optional"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
                  <input
                    value={form[key as keyof AffidavitForm]}
                    onChange={(e) => update(key as keyof AffidavitForm, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Address</span>
                <textarea
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Full residential address"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Annual Income (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.annualIncome}
                    onChange={(e) => update("annualIncome", e.target.value)}
                    placeholder="e.g. 180000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Date</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              {form.annualIncome && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-blue-600">Income in Words</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-blue-950">{incomeWords}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={print}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                >
                  <Printer size={17} /> Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  title="Reset form"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
                This is an editable document template. Verify the wording and required declarations with the relevant authority/notary before use.
              </p>
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto bg-slate-200/70 p-3 sm:p-6">
            <div className="mx-auto max-w-[850px] bg-white px-8 py-10 text-[14px] leading-7 text-slate-900 shadow-xl sm:px-12 sm:py-12 print:mx-0 print:max-w-none print:p-12 print:shadow-none">
              <div className="border-2 border-slate-900 p-6 sm:p-10">
                <div className="text-center">
                  <h1 className="text-xl font-black uppercase tracking-wide">AFFIDAVIT OF INCOME</h1>
                  <p className="mt-1 text-xs font-semibold text-slate-600">Income Declaration</p>
                </div>

                <div className="mt-8 space-y-5 text-justify">
                  <p>
                    I, <strong>{form.name || "____________________________"}</strong>, aged{" "}
                    <strong>{form.age || "____"}</strong> years, son/daughter/wife of{" "}
                    <strong>{form.parentName || "____________________________"}</strong>, residing at{" "}
                    <strong>{form.address || "____________________________________________"}</strong>, do hereby solemnly affirm and declare as follows:
                  </p>

                  <ol className="list-decimal space-y-3 pl-6">
                    <li>I am engaged in <strong>{form.occupation || "________________"}</strong>.</li>
                    <li>My source(s) of income is/are <strong>{form.incomeSource || "________________"}</strong>.</li>
                    <li>My approximate annual income is <strong>₹ {Number(form.annualIncome || 0).toLocaleString("en-IN")}</strong> ({incomeWords || "________________ Rupees Only"}).</li>
                    <li>This affidavit/declaration is being furnished for the purpose of <strong>{form.purpose || "____________________________"}</strong>.</li>
                    <li>The statements made above are true and correct to the best of my knowledge and belief.</li>
                  </ol>

                  <p>
                    I make this declaration knowing that it may be used for the purpose stated above and that the information provided by me should be supported by appropriate documents wherever required.
                  </p>
                </div>

                <div className="mt-14 grid grid-cols-2 gap-10">
                  <div>
                    <p className="text-xs font-semibold">Place: <span className="font-bold">{form.place || "____________"}</span></p>
                    <p className="mt-2 text-xs font-semibold">Date: <span className="font-bold">{formatDate(form.date) || "____________"}</span></p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto mb-2 h-10 border-b border-slate-900" />
                    <p className="text-xs font-bold">{form.declarant || form.name || "Declarant"}</p>
                    <p className="text-[10px] text-slate-500">Signature of Declarant</p>
                  </div>
                </div>

                {(form.witness1 || form.witness2) && (
                  <div className="mt-12 border-t border-slate-300 pt-6">
                    <p className="mb-4 text-xs font-black uppercase tracking-wider">Witnesses</p>
                    <div className="grid grid-cols-2 gap-8 text-xs">
                      <div>1. {form.witness1 || "____________________________"}</div>
                      <div>2. {form.witness2 || "____________________________"}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          .smart-akshaya-tool-layer, .smart-akshaya-tool-layer * { display: block !important; }
          .smart-akshaya-tool-layer { position: static !important; }
        }
      `}</style>
    </div>
  );
}
