"use client";

import {
  Award,
  Calculator,
  CheckCircle2,
  RotateCcw,
  X,
} from "lucide-react";

import { useSSLCCalculator } from "../hooks/useSSLCCalculator";

interface SSLCCalculatorToolProps {
  onClose: () => void;
}

export default function SSLCCalculatorTool({
  onClose,
}: SSLCCalculatorToolProps) {
  const sslc = useSSLCCalculator();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-md sm:p-5">

      <div className="my-5 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[30px] border border-white/80 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:my-8">

        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6">

          <div className="flex items-center gap-3">

            <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 text-white shadow-lg shadow-blue-500/20">
              <Calculator size={20} />
            </div>

            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-800">
                Kerala SSLC Grade Calculator
              </h3>

              <p className="text-[11px] text-slate-500">
                Calculate percentage & overall grade
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={sslc.handleSslcReset}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              <RotateCcw size={14} />
              Reset
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
            >
              <X aria-hidden="true" size={18} />
            </button>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-12 lg:gap-6">
                      {/* LEFT SIDE */}

          <section className="lg:col-span-7">

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm">

              <h4 className="mb-5 text-lg font-black tracking-tight text-slate-800">
                Enter Grade Count
              </h4>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {sslc.gradeCards.map((grade) => (

                  <div
                    key={grade.key}
                    className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]"
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <h5 className={`text-lg font-black ${grade.color}`}>
                          {grade.label}
                        </h5>

                        <p className="text-[11px] text-slate-500">
                          {grade.points}
                        </p>

                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={sslc.grades[grade.key]}
                        onChange={(e) =>
                          sslc.handleSslcInputChange(
                            grade.key,
                            e.target.value
                          )
                        }
                        placeholder="0"
                        className="h-11 w-20 rounded-xl border border-slate-200 bg-slate-50 text-center font-black shadow-inner outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      />

                    </div>

                  </div>

                ))}

              </div>

              <button
                onClick={sslc.calculateSslcResults}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 font-black text-white shadow-[0_14px_32px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(37,99,235,0.3)]"
              >
                <Calculator size={18} />
                Calculate Result
              </button>

            </div>

          </section>
                    {/* RIGHT SIDE */}

          <section className="space-y-4 lg:col-span-5">

            <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:p-6">

              <div className="flex items-center gap-2">

                <Award className="text-amber-500" size={20} />

                <h4 className="text-lg font-black tracking-tight text-slate-800">
                  Result Summary
                </h4>

              </div>

              <div className="mt-6 space-y-3">

                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 shadow-sm">

                  <span className="text-sm text-slate-600">
                    Total Subjects
                  </span>

                  <span className="font-bold">
                    {sslc.totalSubjectsSelected} / 10
                  </span>

                </div>

                {sslc.sslcResultObj ? (

                  <>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 shadow-sm">

                      <span className="text-sm text-slate-600">
                        Total Grade Points
                      </span>

                      <span className="font-bold">
                        {sslc.sslcResultObj.totalPoints}
                      </span>

                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 shadow-sm">

                      <span className="text-sm text-slate-600">
                        Percentage
                      </span>

                      <span className="font-bold text-blue-600">
                        {sslc.sslcResultObj.percentage}%
                      </span>

                    </div>

                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 p-6 text-center text-white shadow-[0_18px_45px_rgba(16,185,129,0.25)]">

                      <CheckCircle2
                        size={36}
                        className="mx-auto mb-3"
                      />

                      <p className="text-sm opacity-90">
                        Overall Grade
                      </p>

                      <h2 className="mt-2 text-4xl font-black tracking-tight">
                        {sslc.sslcResultObj.overallGrade}
                      </h2>

                    </div>

                  </>

                ) : (

                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-8 text-center transition-colors hover:border-blue-200 hover:bg-blue-50/30">

                    <Calculator
                      size={40}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Enter grade counts and click
                      <strong> Calculate Result</strong>.
                    </p>

                  </div>

                )}

              </div>

            </div>
                      </section>

        </div>

      </div>

    </div>
  );
}
