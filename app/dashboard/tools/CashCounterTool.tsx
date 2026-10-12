"use client";

import { Banknote, RotateCcw, X } from "lucide-react";
import { useCashCounter } from "../hooks/useCashCounter";

interface CashCounterToolProps {
  onClose: () => void;
  onComplete?: (amount: number) => void;
}

export default function CashCounterTool({
  onClose,
  onComplete,
}: CashCounterToolProps) {
  const cash = useCashCounter();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-md animate-in fade-in sm:p-5">

      <div className="my-5 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[30px] border border-white/80 bg-white/95 shadow-[0_30px_100px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:my-8">

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-6">

          <div className="flex items-center gap-2">

            <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 p-2.5 text-white shadow-lg shadow-emerald-500/20">
              <Banknote size={20} />
            </div>

            <h3 className="text-lg font-black tracking-tight text-slate-800">
              Cash Counter
            </h3>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={cash.handleCashReset}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
            >
              <RotateCcw size={14}/>
              Reset
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
            >
              <X size={18}/>
            </button>

          </div>

        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-12 md:gap-6">
          {/* LEFT */}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-7">

            {cash.denominations.map((denom) => {

              const qty =
                parseInt(
                  cash.cashCounts[
                    denom as keyof typeof cash.cashCounts
                  ],
                  10
                ) || 0;

              const subtotal = qty * denom;

              return (

                <div
                  key={denom}
                  className="group flex flex-col items-center justify-between space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/75 p-3 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.09)]"
                >

                  <span className="font-extrabold text-slate-800 text-sm">
                    ₹{denom}
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={
                      cash.cashCounts[
                        denom as keyof typeof cash.cashCounts
                      ]
                    }
                    onChange={(e) =>
                      cash.handleCashInputChange(
                        denom as keyof typeof cash.cashCounts,
                        e.target.value
                      )
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white text-center text-sm font-bold shadow-inner outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                  />

                  <span className="text-[11px] font-semibold text-slate-400">
                    = ₹{subtotal}
                  </span>

                </div>

              );
            })}

          </div>

          {/* RIGHT */}

          <div className="space-y-4 md:col-span-5">

            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 shadow-sm">

              <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Summary Details
              </h4>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">

                <span className="text-sm text-slate-600">
                  Total Notes
                </span>

                <span className="font-bold">
                  {cash.totalNotes}
                </span>

              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">

                <span className="text-sm text-slate-600">
                  Total Amount
                </span>

                <span className="font-bold text-emerald-600">
                  ₹{cash.grandTotal}
                </span>

              </div>

            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700 p-6 text-center text-white shadow-[0_18px_45px_rgba(16,185,129,0.25)]">

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-50/90">
                Grand Total
              </p>

              <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                ₹{cash.grandTotal}
              </h2>

            </div>

            <button
              type="button"
              onClick={() => onComplete ? onComplete(cash.grandTotal) : onClose()}
              className="w-full rounded-2xl border border-emerald-600 bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 font-black text-white shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              {onComplete ? "Use Total & Update Wallet" : "Done / Close"}
            </button>

          </div>
                  </div>

      </div>

    </div>
  );
}