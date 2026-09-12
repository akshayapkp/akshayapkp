"use client";

import { FormEvent, useMemo, useState } from "react";

type Detail = { tone: "ok" | "warning" | "neutral" | "danger"; text: string };

type Result = {
  gazetteRequired: boolean;
  title: string;
  details: Detail[];
  approvalChance: number;
  note: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parts(value: string) {
  return normalize(value).split(" ").filter(Boolean);
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, "");
}

function iyCanonical(value: string) {
  return value.replace(/[iy]/g, "i");
}

const MUHAMMAD_VARIANTS = /^(muhammed|mohammed|mohammad|muhammad|mohamed|mohamad|muhamed|muhamad)$/;

function minorVariant(a: string, b: string) {
  if (a === b) return true;
  if (MUHAMMAD_VARIANTS.test(a) && MUHAMMAD_VARIANTS.test(b)) return true;
  return a.length === b.length && iyCanonical(a) === iyCanonical(b);
}

function analyze(oldValue: string, newValue: string): Result {
  const oldParts = parts(oldValue);
  const newParts = parts(newValue);
  const oldNormalized = normalize(oldValue);
  const newNormalized = normalize(newValue);
  const same = oldNormalized === newNormalized;
  const sameCount = oldParts.length === newParts.length;
  const spacingOnly = compact(oldValue) === compact(newValue) && !same;
  const allMinor = sameCount && oldParts.every((part, index) => minorVariant(part, newParts[index]));
  const spacingAndIY = iyCanonical(compact(oldValue)) === iyCanonical(compact(newValue)) && !same;
  const reordered = sameCount && [...oldParts].sort().join(" ") === [...newParts].sort().join(" ") && !same;
  const firstChanged = oldParts[0] !== newParts[0];

  if (same) {
    return {
      gazetteRequired: false,
      title: "Gazette Notification is NOT required — names are identical.",
      details: [{ tone: "ok", text: "No change detected. Names are identical." }],
      approvalChance: 100,
      note: "The entered names match exactly after normalizing spaces and letter case.",
    };
  }

  if (spacingOnly || spacingAndIY || allMinor) {
    const phonetic = oldParts.some((part, index) => newParts[index] && MUHAMMAD_VARIANTS.test(part) && MUHAMMAD_VARIANTS.test(newParts[index]));
    return {
      gazetteRequired: false,
      title: "Gazette Notification is NOT required — change is within allowed exceptions.",
      details: [
        { tone: "ok", text: spacingOnly ? "Only spacing between name parts has changed." : phonetic ? "Phonetic Muhammad/Mohammed spelling variation detected." : "Only an i/y spelling variation was detected." },
        { tone: "neutral", text: `Number of name parts ${oldParts.length === newParts.length ? "matches" : "differs"} between the two names.` },
      ],
      approvalChance: 99,
      note: "This change falls under an accepted exception and should normally be processed without a Gazette notification.",
    };
  }

  if (reordered || firstChanged) {
    return {
      gazetteRequired: true,
      title: "Gazette Notification is required — review the first-name change.",
      details: [
        { tone: "danger", text: reordered ? "The name parts have been reordered. Reordering always requires Gazette." : "The first name is different. A first-name change normally requires Gazette." },
        { tone: "neutral", text: `Number of name parts ${oldParts.length === newParts.length ? "matches" : "differs"} between the two names.` },
      ],
      approvalChance: 28,
      note: "The requested change includes a major first-name or name-order change and should be reviewed with the customer.",
    };
  }

  return {
    gazetteRequired: true,
    title: "Gazette eligibility check required — review the requested change.",
    details: [
      { tone: "warning", text: "The first name is unchanged, but the middle or last name has a substantial change." },
      { tone: "neutral", text: `Number of name parts ${oldParts.length === newParts.length ? "matches" : "differs"} between the two names.` },
    ],
    approvalChance: 58,
    note: "This automated estimate is based on the supplied names and should be confirmed against the applicable Gazette requirements.",
  };
}

export default function AadhaarNameChangePage() {
  const [currentName, setCurrentName] = useState("");
  const [desiredName, setDesiredName] = useState("");
  const [checked, setChecked] = useState(false);
  const result = useMemo(() => currentName.trim() && desiredName.trim() ? analyze(currentName, desiredName) : null, [currentName, desiredName]);

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (currentName.trim() && desiredName.trim()) setChecked(true); }
  function reset() { setCurrentName(""); setDesiredName(""); setChecked(false); }

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
            <div className="mb-5 text-base font-black text-slate-800">✎ Enter Names</div>
            <form onSubmit={submit} className="space-y-4">
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Exact Name as per Aadhaar</span><input value={currentName} onChange={(e) => { setCurrentName(e.target.value); setChecked(false); }} placeholder="e.g. Praveen Kumar Yadav" className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-200" /><span className="mt-1 block text-[11px] text-slate-400">Type the name exactly as printed on the current Aadhaar card.</span></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Name Customer Wants</span><input value={desiredName} onChange={(e) => { setDesiredName(e.target.value); setChecked(false); }} placeholder="e.g. Praveenkumar Yadav" className="w-full rounded-xl border border-white bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-violet-200" /><span className="mt-1 block text-[11px] text-slate-400">Type the desired or corrected name.</span></label>
              <div className="flex flex-wrap gap-2"><button type="submit" disabled={!currentName.trim() || !desiredName.trim()} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50">⌕ Check Eligibility</button><button type="button" onClick={reset} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600">↶ Reset</button></div>
            </form>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_14px_40px_rgba(76,29,149,0.1)] backdrop-blur-xl sm:p-5" role="status">
            <h2 className="mb-4 text-base font-black text-slate-800">✓ Result</h2>
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${result.gazetteRequired ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-300 bg-emerald-100/70 text-emerald-800"}`}><span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${result.gazetteRequired ? "bg-amber-600" : "bg-emerald-700"}`}>{result.gazetteRequired ? "!" : "✓"}</span><p className="text-sm font-black">{result.title}</p></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Aadhaar Name</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{currentName.trim()}</p></div><div className="rounded-xl bg-white/80 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Requested Name</p><p className="mt-1 break-words text-sm font-bold text-slate-800">{desiredName.trim()}</p></div></div>
            <div className="mt-3 space-y-1.5">{result.details.map((detail, index) => <div key={index} className="flex items-start gap-2 rounded-lg bg-white/65 px-3 py-2 text-xs text-slate-700"><span className={`font-black ${detail.tone === "ok" ? "text-emerald-600" : detail.tone === "danger" ? "text-red-600" : detail.tone === "warning" ? "text-amber-600" : "text-slate-400"}`}>●</span><span>{detail.text}</span></div>)}</div>
            <div className="mt-5 flex items-end justify-between"><p className="text-xs font-bold text-slate-600">Estimated Approval Chance (without Gazette)</p><strong className="text-2xl font-black text-blue-500">{result.approvalChance}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${result.approvalChance}%` }} /></div><p className="mt-3 text-xs leading-5 text-slate-500">{result.note}</p><p className="mt-3 border-t border-dashed border-slate-200 pt-3 text-[11px] leading-5 text-slate-400">This is an automated guideline-based estimate only. Final decision rests with UIDAI and the verifying officer. Any first-name change normally requires Gazette, except accepted spacing and i/y variations.</p>
            <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setChecked(false)} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700">← Go Back &amp; Edit</button><button type="button" onClick={reset} className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-black text-white">＋ New Entry</button></div>
          </section>
        )}
      </div>
    </main>
  );
}
