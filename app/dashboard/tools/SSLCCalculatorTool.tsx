"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Calculator, Copy, Percent, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Mode = "grades" | "marks" | "cgpa";
type Basis = "official" | "common" | "estimate";
type ApiResult = { ok: boolean; percentage?: number; display?: string; detail?: string; basis?: Basis; error?: string };
type Institution = { value: string; label: string; mode: Mode; max?: number; defaultMax?: number; hint?: string; formula?: (v: number) => number; basis?: Basis };

const gradeRows = [
  { key: "A+", points: 9 }, { key: "A", points: 8 }, { key: "B+", points: 7 },
  { key: "B", points: 6 }, { key: "C+", points: 5 }, { key: "C", points: 4 },
  { key: "D+", points: 3 }, { key: "D", points: 2 }, { key: "E", points: 1 },
] as const;
type Grade = typeof gradeRows[number]["key"];
const blankGrades = (): Record<Grade, number> => ({ "A+": 0, A: 0, "B+": 0, B: 0, "C+": 0, C: 0, "D+": 0, D: 0, E: 0 });
const x10 = (v: number) => v * 10;
const x95 = (v: number) => v * 9.5;
const minus5 = (v: number) => v * 10 - 5;
const minus75 = (v: number) => v * 10 - 7.5;

const groups: { label: string; items: Institution[] }[] = [
  { label: "Kerala State Board", items: [
    { value: "kerala_sslc", label: "Kerala SSLC (grades)", mode: "grades", max: 10, hint: "SSLC has 10 subjects. Set how many got each grade.", basis: "estimate" },
    { value: "kerala_thslc", label: "Kerala THSLC (grades)", mode: "grades", hint: "Set how many papers got each grade. Any number of subjects.", basis: "estimate" },
    { value: "kerala_hse", label: "Kerala Higher Secondary (+1 / +2)", mode: "marks", defaultMax: 1200, hint: "Usually out of 1200 (6 subjects × 200). Change it if your group differs.", basis: "official" },
  ]},
  { label: "CBSE", items: [
    { value: "cbse_10_cgpa", label: "CBSE Class X (CGPA)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x95, basis: "official" },
    { value: "cbse_10_marks", label: "CBSE Class X (marks)", mode: "marks", defaultMax: 500, hint: "Total of your best five subjects, out of 500.", basis: "official" },
    { value: "cbse_12_marks", label: "CBSE Class XII (marks)", mode: "marks", defaultMax: 500, hint: "Total of your best five subjects, out of 500.", basis: "official" },
  ]},
  { label: "Kerala universities", items: [
    { value: "ktu", label: "KTU (2015, 2019 and 2024 schemes)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "official" },
    { value: "ktu_2019", label: "KTU 2019 scheme (rule before June 2023)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: (v) => v * 10 - 2.5, basis: "official" },
    { value: "kerala_uni", label: "University of Kerala", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "mg_uni", label: "Mahatma Gandhi University (MGU)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus5, basis: "common" },
    { value: "calicut", label: "University of Calicut", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "kannur_ccss", label: "Kannur University (CCSS, 4-point)", mode: "cgpa", max: 4, hint: "CGPA on the 4-point scale used by Kannur CCSS", formula: (v) => v / 4 * 100, basis: "official" },
    { value: "cusat", label: "CUSAT (Cochin University)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus5, basis: "common" },
  ]},
  { label: "Other Indian universities", items: [
    { value: "anna", label: "Anna University", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus75, basis: "common" },
    { value: "aktu", label: "AKTU (Dr. A.P.J. Abdul Kalam Technical University, UP)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "bangalore", label: "Bangalore University", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "calcutta", label: "University of Calcutta (UG)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "du_ug", label: "Delhi University (UG, UGCF 2022)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x95, basis: "common" },
    { value: "du_pg", label: "Delhi University (PG)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus5, basis: "common" },
    { value: "gtu", label: "GTU (Gujarat Technological University)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus5, basis: "common" },
    { value: "jntu", label: "JNTUH / JNTUK / JNTUA (B.Tech)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
    { value: "madras", label: "University of Madras", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus75, basis: "common" },
    { value: "makaut", label: "MAKAUT (West Bengal University of Technology)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus5, basis: "common" },
    { value: "osmania_btech", label: "Osmania University (B.Tech)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: minus75, basis: "common" },
    { value: "vtu", label: "VTU (Visvesvaraya Technological University)", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x95, basis: "common" },
    { value: "ugc_95", label: "Any other university: UGC × 9.5 rule", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x95, basis: "common" },
    { value: "plain_10", label: "Any other university: CGPA × 10 rule", mode: "cgpa", max: 10, hint: "CGPA on the 10-point scale", formula: x10, basis: "common" },
  ]},
];
const allInstitutions = groups.flatMap((g) => g.items);
const basisLabels: Record<Basis, string> = { official: "Official rule", common: "Widely used rule. Confirm with your university.", estimate: "Estimate from grade points, not official marks" };

export default function SSLCCalculatorTool({ onClose }: { onClose?: () => void } = {}) {
  const router = useRouter();
  const [type, setType] = useState("");
  const [grades, setGrades] = useState<Record<Grade, number>>(blankGrades);
  const [cgpa, setCgpa] = useState("");
  const [obtained, setObtained] = useState("");
  const [maximum, setMaximum] = useState("");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = allInstitutions.find((item) => item.value === type);
  const total = useMemo(() => gradeRows.reduce((sum, row) => sum + grades[row.key], 0), [grades]);
  const points = useMemo(() => gradeRows.reduce((sum, row) => sum + grades[row.key] * row.points, 0), [grades]);
  const isExact = selected?.value === "kerala_sslc";
  const isGradeMode = selected?.mode === "grades";

  const selectType = (value: string) => {
    const next = allInstitutions.find((item) => item.value === value);
    setType(value); setResult(null); setGrades(blankGrades()); setCgpa(""); setObtained("");
    setMaximum(next?.defaultMax ? String(next.defaultMax) : "");
  };
  const reset = () => {
    setResult(null); setGrades(blankGrades()); setCgpa(""); setObtained("");
    setMaximum(selected?.defaultMax ? String(selected.defaultMax) : ""); setCopied(false);
  };
  const setGrade = (key: Grade, value: number) => {
    setGrades((prev) => {
      const others = Object.entries(prev).reduce((sum, [k, v]) => sum + (k === key ? 0 : v), 0);
      const cap = isExact ? Math.max(0, 10 - others) : 99;
      return { ...prev, [key]: Math.max(0, Math.min(cap, value)) };
    });
    setResult(null);
  };
  const calculate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || loading) return;
    setLoading(true); setResult(null);
    try {
      let response: ApiResult;
      if (selected.mode === "grades") {
        if (total === 0 || (isExact && total !== 10)) {
          setResult({ ok: false, error: isExact ? "Enter exactly 10 subjects before calculating." : "Enter at least one paper grade before calculating." });
          return;
        }
        const percentage = points / (total * 9) * 100;
        response = { ok: true, percentage, display: percentage.toFixed(2), detail: isExact ? "Calculated from 10 subjects." : `Calculated from ${total} subjects.`, basis: "estimate" };
      } else if (selected.mode === "marks") {
        const got = Number(obtained), max = Number(maximum);
        if (!obtained.trim() || !maximum.trim() || !Number.isFinite(got) || !Number.isFinite(max) || max <= 0 || got < 0 || got > max) {
          setResult({ ok: false, error: "Enter valid marks. Obtained marks must be between 0 and the maximum marks." }); return;
        }
        const percentage = got / max * 100;
        const cbse = type === "cbse_10_marks" || type === "cbse_12_marks";
        response = { ok: true, percentage, display: percentage.toFixed(2), detail: cbse ? "CBSE does not declare an aggregate percentage. Use the total of your best five subjects." : "", basis: "official" };
      } else {
        const score = Number(cgpa), max = selected.max || 10;
        if (!cgpa.trim() || !Number.isFinite(score) || score < 0 || score > max) {
          setResult({ ok: false, error: `Enter a valid CGPA between 0 and ${max}.` }); return;
        }
        const percentage = selected.formula ? selected.formula(score) : score * 10;
        response = { ok: true, percentage, display: percentage.toFixed(2), detail: "", basis: selected.basis || "common" };
      }
      setResult(response);
    } catch {
      setResult({ ok: false, error: "Unable to calculate the percentage. Please check the entered values." });
    } finally { setLoading(false); }
  };
  const copy = async () => {
    if (!result?.ok || !result.display) return;
    try { await navigator.clipboard.writeText(`${selected?.label || "Percentage"}: ${result.display}%`); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
  };

  return (
    <main className="pcv-page">
      <header className="pcv-topbar"><div className="pcv-wrap pcv-bar pcv-bar-standalone">
        <button type="button" className="pcv-chip" onClick={() => (onClose ? onClose() : router.push("/dashboard"))}><ArrowLeft size={15}/> Dashboard</button>
      </div></header>
      <div className="pcv-stage-wrap">
        <form className="pcv-wrap pcv-stage" onSubmit={calculate} noValidate>
          <section className="pcv-panel pcv-inputs">
            <div className="pcv-head"><span className="pcv-ico"><Percent size={19}/></span><div><h1>Percentage converter</h1><p>Turn grades, CGPA or marks into a percentage</p></div></div>
            <div><label className="pcv-label" htmlFor="pcv-type">Board or university</label>
              <select id="pcv-type" value={type} onChange={(e) => selectType(e.target.value)} required>
                <option value="" disabled>Select your board or university</option>
                {groups.map((group) => <optgroup key={group.label} label={group.label}>{group.items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}
              </select>
            </div>
            {selected?.mode === "cgpa" && <div className="pcv-mode"><label className="pcv-label" htmlFor="pcv-cgpa">CGPA (0 to {selected.max})</label><input id="pcv-cgpa" className="pcv-num pcv-cgpa" value={cgpa} onChange={(e) => {setCgpa(e.target.value.replace(/[^0-9.]/g, ""));setResult(null);}} inputMode="decimal" placeholder="e.g. 8.45" maxLength={6}/><p className="pcv-hint">{selected.hint}</p></div>}
            {selected?.mode === "marks" && <div className="pcv-mode"><div className="pcv-two">
              <div><label className="pcv-label" htmlFor="pcv-obtained">Marks obtained</label><input id="pcv-obtained" className="pcv-num" value={obtained} onChange={(e) => {setObtained(e.target.value.replace(/[^0-9.]/g, ""));setResult(null);}} inputMode="decimal" placeholder="e.g. 1080"/></div>
              <div><label className="pcv-label" htmlFor="pcv-maximum">Maximum marks</label><input id="pcv-maximum" className="pcv-num" value={maximum} onChange={(e) => {setMaximum(e.target.value.replace(/[^0-9.]/g, ""));setResult(null);}} inputMode="decimal" placeholder="e.g. 1200"/></div>
            </div><p className="pcv-hint">{selected.hint}</p></div>}
            {isGradeMode && <div className="pcv-mode">
              <div className="pcv-grades">{gradeRows.map((row) => <div key={row.key} className={`pcv-grade ${grades[row.key] > 0 ? "on" : ""}`}>
                <span className="pcv-grade-name">{row.key}<small>{row.points} pts</small></span>
                <span className="pcv-step"><button type="button" aria-label={`One fewer ${row.key}`} disabled={grades[row.key] <= 0} onClick={() => setGrade(row.key, grades[row.key] - 1)}><Minus size={13}/></button><input aria-label={`Subjects with grade ${row.key}`} value={grades[row.key]} inputMode="numeric" maxLength={2} onChange={(e) => setGrade(row.key, Number(e.target.value.replace(/\D/g, "") || 0))}/><button type="button" aria-label={`One more ${row.key}`} disabled={(isExact && total >= 10) || grades[row.key] >= 99} onClick={() => setGrade(row.key, grades[row.key] + 1)}><Plus size={13}/></button></span>
              </div>)}</div>
              <div className={`pcv-count ${isExact && total === 10 ? "full" : ""}`}>
                {isExact && <div className="pcv-pips">{Array.from({length:10},(_,i)=><i key={i} className={i<total?"filled":""}/>)}</div>}
                <span>{isExact ? <><b>{total}</b> of 10 subjects. {total===10 ? "Ready." : `Add ${10-total} more.`}</> : <><b>{total}</b> {total===1?"paper":"papers"} entered</>}</span>
              </div><p className="pcv-hint">{selected.hint}</p>
            </div>}
            {result && !result.ok && <p className="pcv-error" role="alert">{result.error}</p>}
            <div className="pcv-actions"><button type="submit" className={`pcv-btn ${loading?"loading":""}`} disabled={!selected || loading}><span className="pcv-spinner"/>{loading?"Calculating":"Calculate"}</button><button type="button" className="pcv-btn ghost" onClick={reset}>Reset</button></div>
          </section>
          <aside className={`pcv-panel pcv-result ${result && !result.ok?"has-error":""}`} aria-live="polite">
            <div className="pcv-res-top"><span>Equivalent percentage</span>{result?.ok && <button type="button" className="pcv-copy" onClick={copy}><Copy size={13}/>{copied?"Copied":"Copy"}</button>}</div>
            {!result && <div className="pcv-empty"><span className="pcv-empty-icon"><Calculator size={18}/></span><div><h2>Your percentage shows here</h2><p>{selected?.mode==="grades"?"Set the grade counts, then press Calculate.":"Fill in your result and press Calculate."}</p></div></div>}
            {result?.ok && <div className="pcv-result-body"><div className="pcv-big">{result.display}<small>%</small></div><div className="pcv-meter"><i style={{width:`${Math.max(0,Math.min(result.percentage||0,100))}%`}}/></div>{result.detail && <p className="pcv-detail">{result.detail}</p>}<span className={`pcv-basis ${result.basis||"common"}`}>{basisLabels[result.basis||"common"]}</span></div>}
            {result && !result.ok && <div className="pcv-error-view"><span className="pcv-empty-icon">!</span><div><h2>Check your entry</h2><p>{result.error}</p></div></div>}
          </aside>
        </form>
      </div>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .dashboard-content:has(.pcv-page){padding:0!important;min-height:100dvh!important;overflow:hidden!important}.pcv-page{width:100%;min-height:100dvh;height:100dvh;--pcv-ink:#1f2340;--pcv-muted:#5f647f;--pcv-violet:#4f3fc4;display:flex;flex-direction:column;color:var(--pcv-ink);font:15px/1.5 'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000' viewBox='0 0 1600 1000' fill='none' stroke='white' stroke-opacity='.5' stroke-width='1.2'%3E%3Ccircle cx='1300' cy='170' r='150'/%3E%3Ccircle cx='1300' cy='170' r='250'/%3E%3Ccircle cx='1300' cy='170' r='350'/%3E%3Ccircle cx='1300' cy='170' r='450'/%3E%3Ccircle cx='200' cy='900' r='130'/%3E%3Ccircle cx='200' cy='900' r='230'/%3E%3Ccircle cx='200' cy='900' r='330'/%3E%3C/svg%3E") center/cover no-repeat,radial-gradient(720px 520px at 6% 0%,#c7c3ee 0%,transparent 65%),radial-gradient(660px 500px at 96% 6%,#a9cdf5 0%,transparent 65%),radial-gradient(720px 540px at 62% 100%,#a6dcc9 0%,transparent 65%),#d3dcee;overflow:auto}
        .pcv-page *{box-sizing:border-box}.pcv-wrap{width:100%;max-width:1100px;margin:0 auto;padding:0 24px}.pcv-topbar{flex:none;height:64px;background:rgba(255,255,255,.45);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.85)}.pcv-bar{height:100%;display:flex;align-items:center;justify-content:space-between}.pcv-brand{display:flex;align-items:center;gap:10px;font-weight:600}.pcv-brand-mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#1f2340;color:white;font-size:.72rem;font-weight:700}.pcv-chip{height:40px;padding:0 14px;border:1px solid rgba(255,255,255,.85);border-radius:999px;background:rgba(255,255,255,.5);display:flex;align-items:center;gap:8px;font-size:.875rem;font-weight:500;cursor:pointer}.pcv-chip:hover{background:rgba(255,255,255,.85)}
        .pcv-stage-wrap{flex:1;min-height:0;display:flex;overflow:auto}.pcv-stage{margin:auto;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;padding-top:16px;padding-bottom:16px;align-items:stretch}.pcv-panel{border-radius:24px;border:1px solid #fff;backdrop-filter:blur(20px);padding:22px;display:flex;flex-direction:column;gap:14px;min-width:0}.pcv-inputs{background:linear-gradient(155deg,rgba(124,108,240,.2),rgba(124,108,240,0) 78%),rgba(255,255,255,.7);box-shadow:0 14px 30px -18px rgba(124,108,240,.4),inset 0 1px 0 rgba(255,255,255,.8)}.pcv-result{background:linear-gradient(155deg,rgba(16,182,134,.22),rgba(16,182,134,0) 78%),rgba(255,255,255,.68);box-shadow:0 14px 30px -18px rgba(16,182,134,.4),inset 0 1px 0 rgba(255,255,255,.8)}.pcv-result.has-error{background:linear-gradient(155deg,rgba(245,135,70,.2),rgba(245,135,70,0) 78%),rgba(255,255,255,.68)}
        .pcv-head{display:flex;align-items:center;gap:12px}.pcv-ico{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.92);color:#4f3fc4;box-shadow:0 8px 18px -12px rgba(63,1,248,.6)}.pcv-head h1{font-size:1.25rem;font-weight:600;letter-spacing:-.02em;line-height:1.2}.pcv-head p{font-size:.8125rem;color:#5f647f}.pcv-label{display:block;font-size:.8125rem;font-weight:600;color:#4d526e;margin-bottom:6px}.pcv-page select,.pcv-num{width:100%;height:48px;padding:0 14px;font:500 .9375rem 'DM Sans',sans-serif;color:#1f2340;background:rgba(255,255,255,.9);border:1.5px solid #fff;border-radius:14px;outline:none;transition:border-color .2s,box-shadow .2s}.pcv-page select{appearance:none;padding-right:40px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none' stroke='%235f647f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center}.pcv-page select:focus,.pcv-num:focus{border-color:#4f3fc4;box-shadow:0 0 0 3px rgba(124,108,240,.16)}.pcv-num::placeholder{color:#8b90ad;font-weight:400}.pcv-cgpa{height:60px;font-size:1.5rem;font-weight:700;letter-spacing:-.02em}.pcv-mode{display:grid;gap:10px;align-content:start}.pcv-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pcv-hint{font-size:.8125rem;color:#5f647f;margin-top:0}
        .pcv-grades{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pcv-grade{display:grid;grid-template-columns:1fr auto;align-items:center;gap:6px;padding:8px 8px 8px 12px;border-radius:16px;background:rgba(255,255,255,.8);border:1.5px solid #fff;transition:border-color .2s,background .2s}.pcv-grade.on{border-color:rgba(124,108,240,.5);background:#fff}.pcv-grade-name{font-weight:700;font-size:1.0625rem;line-height:1.1}.pcv-grade-name small{display:block;font-size:.6875rem;font-weight:500;color:#5f647f;margin-top:2px}.pcv-step{display:flex;align-items:center;gap:2px}.pcv-step button{width:30px;height:30px;border:0;border-radius:50%;background:rgba(124,108,240,.12);color:#4f3fc4;cursor:pointer;display:grid;place-items:center}.pcv-step button:disabled{opacity:.3;cursor:not-allowed}.pcv-step input{width:30px;height:30px;border:0;background:transparent;text-align:center;font:700 1rem 'DM Sans',sans-serif;color:#1f2340;outline:none}.pcv-count{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;background:rgba(255,255,255,.75);font-size:.8125rem;font-weight:600;color:#4d526e}.pcv-pips{display:flex;gap:4px;flex:1}.pcv-pips i{flex:1;height:8px;border-radius:99px;background:rgba(124,108,240,.16)}.pcv-pips i.filled{background:#4f3fc4}.pcv-count.full{color:#0a6f52}.pcv-count.full .pcv-pips i.filled{background:#10b686}.pcv-count b{color:#1f2340}
        .pcv-actions{display:flex;gap:8px;margin-top:auto}.pcv-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 24px;border:0;border-radius:999px;background:#1f2340;color:#fff;font-weight:600;font-size:.9375rem;cursor:pointer;transition:transform .2s,opacity .2s;flex:1}.pcv-btn:hover:not(:disabled){transform:translateY(-1px)}.pcv-btn:disabled{opacity:.5;cursor:not-allowed}.pcv-btn.ghost{flex:none;background:rgba(255,255,255,.85);color:#1f2340;padding:0 20px}.pcv-spinner{display:none;width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:pcv-spin .7s linear infinite}.pcv-btn.loading .pcv-spinner{display:inline-block}@keyframes pcv-spin{to{transform:rotate(360deg)}}
        .pcv-res-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;color:#5f647f;font-size:.8125rem;font-weight:600}.pcv-copy{height:30px;padding:0 12px;border:0;border-radius:999px;background:rgba(255,255,255,.85);font-size:.75rem;font-weight:600;color:#0a6f52;cursor:pointer;display:inline-flex;align-items:center;gap:6px}.pcv-result-body{display:flex;flex-direction:column;gap:12px;flex:1;justify-content:center}.pcv-big{font-size:clamp(3.2rem,7vw,4.75rem);font-weight:700;letter-spacing:-.045em;line-height:1;font-variant-numeric:tabular-nums}.pcv-big small{font-size:1.75rem;font-weight:500;color:#5f647f;letter-spacing:0;margin-left:2px}.pcv-meter{height:10px;border-radius:99px;background:rgba(255,255,255,.85);overflow:hidden}.pcv-meter i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#10b686,#2e96f0);transition:width .8s cubic-bezier(.2,.8,.2,1)}.pcv-detail{font-size:.8125rem;color:#4d526e}.pcv-basis{display:inline-flex;align-items:center;align-self:flex-start;font-size:.75rem;font-weight:600;padding:5px 12px;border-radius:999px;background:#0a6f52;color:#fff}.pcv-basis.common,.pcv-basis.estimate{background:#fff4d6;color:#7a5300}.pcv-empty,.pcv-error-view{display:flex;flex-direction:column;gap:10px;margin:auto 0;color:#5f647f}.pcv-empty-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:rgba(255,255,255,.92);color:#0a6f52}.pcv-empty h2,.pcv-error-view h2{font-size:1.0625rem;font-weight:600;color:#1f2340}.pcv-empty p,.pcv-error-view p{font-size:.9375rem;color:#5f647f}.pcv-error{padding:10px 12px;border:1px solid #fecaca;border-radius:12px;background:#fef2f2;color:#b91c1c;font-size:.85rem}.pcv-error-view h2{color:#b42318}
        @media(max-width:860px){.pcv-wrap{padding:0 12px}.pcv-stage{grid-template-columns:1fr;gap:10px;padding-top:10px;padding-bottom:10px}.pcv-panel{padding:12px;border-radius:20px;gap:10px}.pcv-topbar{height:48px}.pcv-brand-mark{width:30px;height:30px}.pcv-brand>span:last-child{display:none}.pcv-chip{height:32px;padding:0 11px;font-size:.8125rem}.pcv-head{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.pcv-page select,.pcv-num{height:44px}.pcv-cgpa{height:52px;font-size:1.25rem}.pcv-grade{grid-template-columns:1fr;grid-template-rows:auto auto;padding:5px 5px 5px 10px;gap:0;justify-items:start}.pcv-grade-name{display:flex;align-items:baseline;gap:6px;font-size:1rem}.pcv-grade-name small{display:inline;margin:0}.pcv-step{width:100%;justify-content:space-between}.pcv-step button,.pcv-step input{width:26px;height:26px}.pcv-count{padding:7px 12px}.pcv-btn{height:44px}.pcv-result{gap:8px}.pcv-res-top{min-height:26px}.pcv-copy{height:26px}.pcv-result-body{flex:none;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.pcv-big{font-size:2.5rem}.pcv-big small{font-size:1.25rem}.pcv-meter{flex-basis:100%;height:8px}.pcv-detail{display:none}.pcv-basis{border-radius:14px;line-height:1.3;padding:4px 10px;font-size:.6875rem;max-width:58%}.pcv-empty,.pcv-error-view{flex-direction:row;align-items:center;margin:0}.pcv-empty-icon{flex:none;width:38px;height:38px;border-radius:12px}.pcv-empty h2,.pcv-error-view h2{font-size:.9375rem}.pcv-empty p,.pcv-error-view p{font-size:.8125rem}}
        @media(max-width:430px){.pcv-grades{gap:6px}.pcv-grade{padding-left:7px}.pcv-step{gap:0}.pcv-step input{width:22px}}
      `}</style>
    </main>
  );
}
