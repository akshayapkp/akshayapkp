"use client";

import { FormEvent, useMemo, useState } from "react";

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export default function AadhaarNameChangePage() {
  const [currentName, setCurrentName] = useState("");
  const [desiredName, setDesiredName] = useState("");
  const [checked, setChecked] = useState(false);

  const eligibility = useMemo(() => {
    if (!currentName.trim() || !desiredName.trim()) return null;
    const current = normalizeName(currentName);
    const desired = normalizeName(desiredName);
    return {
      eligible: current !== desired,
      sameName: current === desired,
    };
  }, [currentName, desiredName]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecked(true);
  }

  function reset() {
    setCurrentName("");
    setDesiredName("");
    setChecked(false);
  }

  return (
    <main className="min-h-full bg-gradient-to-br from-sky-50 via-white to-violet-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-[0_10px_35px_rgba(37,99,235,0.1)] backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Akshaya Smart</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-blue-600 sm:text-2xl">
            Aadhaar Name Change Check
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Check if a Gazette name-change notification is required.
          </p>
        </header>

        <section className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_14px_40px_rgba(76,29,149,0.1)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-base font-black text-slate-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600">✎</span>
            Enter Names
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Exact Name as per Aadhaar</span>
              <input
                value={currentName}
                onChange={(event) => { setCurrentName(event.target.value); setChecked(false); }}
                placeholder="e.g. Praveen Kumar Yadav"
                className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              />
              <span className="mt-1 block text-[11px] text-slate-400">Type the name exactly as printed on the current Aadhaar card.</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Name Customer Wants</span>
              <input
                value={desiredName}
                onChange={(event) => { setDesiredName(event.target.value); setChecked(false); }}
                placeholder="e.g. Praveenkumar Yadav"
                className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              />
              <span className="mt-1 block text-[11px] text-slate-400">Type the desired or corrected name.</span>
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50" disabled={!currentName.trim() || !desiredName.trim()}>
                <span aria-hidden="true">⌕</span> Check Eligibility
              </button>
              <button type="button" onClick={reset} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">
                ↶ Reset
              </button>
            </div>
          </form>

          {checked && eligibility && (
            <div className={`mt-5 rounded-xl border p-4 text-sm ${eligibility.eligible ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
              <p className="font-black">{eligibility.eligible ? "Gazette eligibility check required" : "No name change detected"}</p>
              <p className="mt-1 text-xs leading-5">
                {eligibility.eligible ? "The requested name differs from the Aadhaar name. Review Gazette notification requirements with the customer." : "Both names are the same after spacing normalization."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
