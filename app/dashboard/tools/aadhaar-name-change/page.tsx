"use client";

import { FormEvent, useMemo, useState } from "react";

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function words(value: string) {
  return normalizeName(value).split(" ").filter(Boolean);
}

export default function AadhaarNameChangePage() {
  const [currentName, setCurrentName] = useState("");
  const [desiredName, setDesiredName] = useState("");
  const [checked, setChecked] = useState(false);

  const result = useMemo(() => {
    if (!currentName.trim() || !desiredName.trim()) return null;
    const current = normalizeName(currentName);
    const desired = normalizeName(desiredName);
    const currentParts = words(current);
    const desiredParts = words(desired);
    const firstNameUnchanged = currentParts[0] === desiredParts[0];
    const sameName = current === desired;
    const partDifference = currentParts.length !== desiredParts.length;
    const minorVariation = firstNameUnchanged && currentParts.length === desiredParts.length;
    const approvalChance = sameName ? 100 : minorVariation ? 99 : partDifference ? 42 : 68;
    return { sameName, firstNameUnchanged, partDifference, minorVariation, approvalChance };
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
    <main className="min-h-full bg-gradient-to-br from-sky-50 via-white to-violet-50 p-3 sm:p-5">
      <div className="mx-auto max-w-3xl">
        <header className="mb-4 rounded-2xl border border-white/80 bg-white/70 px-5 py-4 shadow-[0_10px_35px_rgba(37,99,235,0.1)] backdrop-blur-xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Akshaya Smart</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-blue-600 sm:text-2xl">Aadhaar Name Change Check</h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">Check if a Gazette name-change notification is required.</p>
        </header>

        {!checked || !result ? (
          <section className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-[0_14px_40px_rgba(76,29,149,0.1)] backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-center gap-2 text-base font-black text-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600" aria-hidden="true">✎</span>
              Enter Names
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Exact Name as per Aadhaar</span>
                <input value={currentName} onChange={(event) => { setCurrentName(event.target.value); setChecked(false); }} placeholder="e.g. Praveen Kumar Yadav" className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200" />
                <span className="mt-1 block text-[11px] text-slate-400">Type the name exactly as printed on the current Aadhaar card.</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Name Customer Wants</span>
                <input value={desiredName} onChange={(event) => { setDesiredName(event.target.value); setChecked(false); }} placeholder="e.g. Praveenkumar Yadav" className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 transition focus:border-violet-400 focus:ring-2 focus:ring-violet-200" />
                <span className="mt-1 block text-[11px] text-slate-400">Type the desired or corrected name.</span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-xl" disabled={!currentName.trim() || !desiredName.trim()}>⌕ Check Eligibility</button>
                <button type="button" onClick={reset} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-200">↶ Reset</button>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_14px_40px_rgba(76,29,149,0.1)] backdrop-blur-xl sm:p-5" role="status">
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${result.sameName || result.minorVariation ? "border-emerald-300 bg-emerald-100/70 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}`}>
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-black text-white" aria-hidden="true">✓</span>
              <p className="text-sm font-black">{result.sameName || result.minorVariation ? "Gazette Notification is NOT required — change is within allowed exceptions." : "Gazette notification may be required — review the name change with the customer."}</p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Aadhaar Name</p><p className="mt-1 text-sm font-bold text-slate-800">{currentName.trim()}</p></div>
              <div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Requested Name</p><p className="mt-1 text-sm font-bold text-slate-800">{desiredName.trim()}</p></div>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center gap-2 rounded-lg bg-white/65 px-3 py-2"><span className="font-black text-emerald-600">●</span><span>First name is {result.firstNameUnchanged ? "unchanged" : "different"} (or only a minor variation). Change appears limited to middle/last name parts.</span></div>
              <div className="flex items-center gap-2 rounded-lg bg-white/65 px-3 py-2"><span className="font-black text-slate-400">●</span><span>Number of name parts {result.partDifference ? "differs" : "matches"} between the two names.</span></div>
            </div>

            <div className="mt-5 flex items-end justify-between"><p className="text-xs font-bold text-slate-600">Estimated Approval Chance (without Gazette)</p><strong className="text-2xl font-black text-blue-500">{result.approvalChance}%</strong></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${result.approvalChance}%` }} /></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">This change falls under an accepted exception and/or the names sound effectively the same, so it should normally be processed without a Gazette notification.</p>
            <p className="mt-3 text-[11px] leading-5 text-slate-400">This is an automated guideline-based estimate only. Final decision rests with UIDAI and the verifying officer. Gazette requirements may vary by the exact name change.</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setChecked(false)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200">← Go Back &amp; Edit</button>
              <button type="button" onClick={reset} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5">＋ New Entry</button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
