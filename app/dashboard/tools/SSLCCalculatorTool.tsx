"use client";

import { useMemo, useState } from "react";
import { Award, Calculator, CheckCircle2, Copy, RotateCcw, X, Minus, Plus } from "lucide-react";

interface Props {
  onClose: () => void;
}

const INSTITUTIONS = [
  "Kerala SSLC",
  "Kerala THSLC",
  "Kerala Higher Secondary (+1)",
  "Kerala Higher Secondary (+2)",
  "CBSE Class X",
  "CBSE Class XII",
  "KTU",
  "KTU 2019 Regulation",
  "Kerala University",
  "Mahatma Gandhi University (MGU)",
  "University of Calicut",
  "Kannur University (CCSS)",
  "CUSAT",
  "Anna University",
  "Dr. A.P.J. Abdul Kalam Technical University (AKTU)",
  "Bangalore University",
  "University of Calcutta",
  "University of Delhi (UG)",
  "University of Delhi (PG)",
  "Gujarat Technological University (GTU)",
  "JNTU",
  "University of Madras",
  "MAKAUT",
  "Osmania University",
  "Visvesvaraya Technological University (VTU)",
  "Other Board / University",
] as const;

const GRADES = [
  { key: "Aplus", label: "A+", points: 9, color: "text-purple-600" },
  { key: "A", label: "A", points: 8, color: "text-indigo-600" },
  { key: "Bplus", label: "B+", points: 7, color: "text-blue-600" },
  { key: "B", label: "B", points: 6, color: "text-cyan-600" },
  { key: "Cplus", label: "C+", points: 5, color: "text-emerald-600" },
  { key: "C", label: "C", points: 4, color: "text-amber-600" },
  { key: "Dplus", label: "D+", points: 3, color: "text-orange-600" },
  { key: "D", label: "D", points: 2, color: "text-rose-600" },
  { key: "E", label: "E", points: 1, color: "text-red-600" },
] as const;

type GradeKey = (typeof GRADES)[number]["key"];
type Result = { percentage: number; detail: string; grade?: string };

const isKeralaGradeSystem = (name: string) =>
  name === "Kerala SSLC" || name === "Kerala THSLC";

const isCbseTen = (name: string) => name === "CBSE Class X";

export default function SSLCCalculatorTool({ onClose }: Props) {
  const [institution, setInstitution] = useState<string>("Kerala SSLC");
  const [mode, setMode] = useState<"grades" | "marks" | "cgpa">("grades");
  const [grades, setGrades] = useState<Record<GradeKey, number>>({
    Aplus: 0, A: 0, Bplus: 0, B: 0, Cplus: 0, C: 0, Dplus: 0, D: 0, E: 0,
  });
  const [obtained, setObtained] = useState("");
  const [maximum, setMaximum] = useState("100");
  const [cgpa, setCgpa] = useState("");
  const [multiplier, setMultiplier] = useState("10");
  const [customMultiplier, setCustomMultiplier] = useState("10");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const totalSubjects = useMemo(() => Object.values(grades).reduce((sum, n) => sum + n, 0), [grades]);
  const gradePoints = useMemo(
    () => GRADES.reduce((sum, grade) => sum + grades[grade.key] * grade.points, 0),
    [grades],
  );

  const changeInstitution = (value: string) => {
    setInstitution(value);
    setResult(null);
    setError("");
    if (isKeralaGradeSystem(value)) {
      setMode("grades");
    } else if (isCbseTen(value)) {
      setMode("cgpa");
      setMultiplier("9.5");
    } else {
      setMode("marks");
      setMultiplier("10");
    }
  };

  const reset = () => {
    setGrades({ Aplus: 0, A: 0, Bplus: 0, B: 0, Cplus: 0, C: 0, Dplus: 0, D: 0, E: 0 });
    setObtained("");
    setMaximum("100");
    setCgpa("");
    setMultiplier(institution === "CBSE Class X" ? "9.5" : "10");
    setCustomMultiplier("10");
    setResult(null);
    setError("");
    setCopied(false);
  };

  const calculate = () => {
    setError("");
    setResult(null);
    if (mode === "grades") {
      if (totalSubjects !== 10) {
        setError("ദയവായി കൃത്യം 10 വിഷയങ്ങളുടെ ഗ്രേഡുകൾ നൽകുക.");
        return;
      }
      const percentage = (gradePoints / 90) * 100;
      const overall = percentage >= 90 ? "A+" : percentage >= 80 ? "A" : percentage >= 70 ? "B+" : percentage >= 60 ? "B" : percentage >= 50 ? "C+" : percentage >= 40 ? "C" : "D / E";
      setResult({ percentage: Number(percentage.toFixed(2)), detail: `Total Grade Points: ${gradePoints} / 90`, grade: overall });
      return;
    }
    if (mode === "marks") {
      const scored = Number(obtained);
      const total = Number(maximum);
      if (obtained.trim() === "" || maximum.trim() === "" || !Number.isFinite(scored) || !Number.isFinite(total) || total <= 0 || scored < 0 || scored > total) {
        setError("Enter valid marks. Obtained marks must be between 0 and the maximum marks.");
        return;
      }
      setResult({ percentage: Number(((scored / total) * 100).toFixed(2)), detail: `Marks: ${scored} / ${total}` });
      return;
    }
    const score = Number(cgpa);
    const factor = multiplier === "custom" ? Number(customMultiplier) : Number(multiplier);
    if (cgpa.trim() === "" || !Number.isFinite(score) || score < 0 || score > 10 || !Number.isFinite(factor) || factor <= 0) {
      setError("Enter a valid CGPA (0–10) and conversion multiplier.");
      return;
    }
    const percentage = score * factor;
    setResult({ percentage: Number(percentage.toFixed(2)), detail: `CGPA: ${score} × ${factor}${percentage > 100 ? " (above 100%; verify the applicable university formula)" : ""}` });
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${institution}\nPercentage: ${result.percentage}%\n${result.detail}${result.grade ? `\nOverall Grade: ${result.grade}` : ""}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy the result. Please copy it manually.");
    }
  };

  const updateGrade = (key: GradeKey, delta: number) => {
    setGrades((previous) => ({ ...previous, [key]: Math.max(0, Math.min(10, previous[key] + delta)) }));
    setResult(null);
    setError("");
  };

  const gradeMode = mode === "grades";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-md sm:p-5">
      <div className="my-5 flex max-h-[94vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[30px] border border-white/80 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:my-8">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-blue-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-800">Percentage Converter</h3>
              <p className="text-[11px] text-slate-500">School Boards & University Percentage Calculator</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" onClick={onClose} aria-label="Close Percentage Converter" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900">
              <X aria-hidden />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-12 lg:gap-6">
          <section className="space-y-4 lg:col-span-7">
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-purple-50 via-blue-50 to-emerald-50 p-5 shadow-sm">
              <label htmlFor="percentage-institution" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-600">Select Board / University</label>
              <select id="percentage-institution" value={institution} onChange={(event) => changeInstitution(event.target.value)} className="w-full rounded-xl border border-white bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10">
                {INSTITUTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-white bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-600">{gradeMode ? "Grade Point Method" : mode === "marks" ? "Marks Method" : "CGPA Conversion"}</span>
                <span className="rounded-full border border-white bg-white/80 px-3 py-1 text-[11px] font-bold text-slate-600">Live calculation on submit</span>
              </div>
            </div>

            {gradeMode ? (
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-lg font-black tracking-tight text-slate-800">Enter Grade Count</h4>
                    <p className="text-xs text-slate-500">A+ = 9 points through E = 1 point</p>
                  </div>
                  <div className={`rounded-xl px-3 py-2 text-sm font-black ${totalSubjects === 10 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}> {totalSubjects} / 10 Subjects</div>
                </div>
                <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500 transition-all duration-300" style={{ width: `${Math.min(totalSubjects / 10, 1) * 100}%` }} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {GRADES.map((grade) => (
                    <div key={grade.key} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div><h5 className={`text-lg font-black ${grade.color}`}>{grade.label}</h5><p className="text-[11px] text-slate-500">{grade.points} Grade Points</p></div>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label={`Decrease ${grade.label}`} onClick={() => updateGrade(grade.key, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><Minus size={15} /></button>
                          <span className="w-7 text-center text-lg font-black tabular-nums text-slate-800">{grades[grade.key]}</span>
                          <button type="button" aria-label={`Increase ${grade.label}`} onClick={() => updateGrade(grade.key, 1)} disabled={totalSubjects >= 10 || grades[grade.key] >= 10} className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"><Plus size={15} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">Enter exactly 10 subjects. Maximum grade points: 90.</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm">
                <h4 className="mb-5 text-lg font-black tracking-tight text-slate-800">{mode === "marks" ? "Enter Marks" : "Enter CGPA"}</h4>
                {mode === "marks" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-xs font-bold text-slate-600">Obtained Marks<input type="number" min="0" step="any" value={obtained} onChange={(e) => { setObtained(e.target.value); setResult(null); }} placeholder="e.g. 425" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label>
                    <label className="text-xs font-bold text-slate-600">Maximum Marks<input type="number" min="1" step="any" value={maximum} onChange={(e) => { setMaximum(e.target.value); setResult(null); }} placeholder="e.g. 500" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-slate-600">CGPA (out of 10)<input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => { setCgpa(e.target.value); setResult(null); }} placeholder="e.g. 8.25" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10" /></label>
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-600">Conversion Formula</label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button type="button" onClick={() => setMultiplier("10")} className={`rounded-xl border px-3 py-3 text-sm font-bold ${multiplier === "10" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>CGPA × 10</button>
                        <button type="button" onClick={() => setMultiplier("9.5")} className={`rounded-xl border px-3 py-3 text-sm font-bold ${multiplier === "9.5" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>UGC / CBSE × 9.5</button>
                        <button type="button" onClick={() => setMultiplier("custom")} className={`rounded-xl border px-3 py-3 text-sm font-bold ${multiplier === "custom" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>Custom Formula</button>
                      </div>
                      {multiplier === "custom" && <label className="mt-3 block text-xs font-bold text-slate-600">Multiplier<input type="number" min="0.01" step="0.01" value={customMultiplier} onChange={(e) => setCustomMultiplier(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-800 outline-none focus:border-blue-400" /></label>}
                      <p className="mt-3 text-xs leading-relaxed text-slate-500">Conversion rules can differ by regulation and year. Confirm the applicable formula on the official marksheet / university regulations before using the result.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}
            <button type="button" onClick={calculate} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 py-3.5 font-black text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:shadow-lg"><Calculator size={18} /> Calculate Percentage</button>
          </section>

          <section className="space-y-4 lg:col-span-5">
            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-2"><Award className="text-amber-500" size={20} /><h4 className="text-lg font-black tracking-tight text-slate-800">Result Summary</h4></div>
              {result ? (
                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Board / University</p><p className="mt-1 text-sm font-bold text-slate-800">{institution}</p></div>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-6 text-center text-white shadow-[0_18px_45px_rgba(59,130,246,0.25)]">
                    <CheckCircle2 size={34} className="mx-auto mb-3" /><p className="text-sm opacity-90">Calculated Percentage</p><h2 className="mt-2 text-4xl font-black tracking-tight">{result.percentage}%</h2>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-emerald-300 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(result.percentage, 100))}%` }} /></div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{result.detail}</p>{result.grade && <p className="mt-2 text-sm font-black text-emerald-700">Overall Grade: {result.grade}</p>}</div>
                  <button type="button" onClick={copyResult} className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"><Copy size={15} /> {copied ? "Copied!" : "Copy Result"}</button>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                  <Calculator size={40} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">Select your board or university, enter the marks / CGPA, and calculate your percentage.</p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-800"><strong>Important:</strong> Marks-based percentage is calculated as (obtained marks ÷ maximum marks) × 100. CGPA multipliers are selectable; institution-specific conversion rules may vary.</div>
          </section>
        </div>
      </div>
    </div>
  );
}
