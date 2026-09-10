"use client";

import { FormEvent, useState } from "react";

type Result = {
  applicationReference?: string;
  fileNumber?: string;
  dateOfBirth?: string;
  applicationDate?: string;
  lastModifiedDate?: string;
  applicantName?: string;
  applicationType?: string;
  status?: string;
  statusMessage?: string;
  policeVerificationOffice?: string;
  ivrCode?: string;
  smsCode?: string;
};

export default function PassportStatusPage() {
  const [fileNo, setFileNo] = useState("");
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkStatus(event: FormEvent) {
    event.preventDefault();
    setError("");
    setResult(null);

    const normalizedFile = fileNo.trim().toUpperCase();
    const normalizedDob = dob.trim();

    if (!normalizedFile) {
      setError("Please enter the Passport File Number.");
      return;
    }

    if (!normalizedDob) {
      setError("Please enter the Date of Birth.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/passport/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileNo: normalizedFile,
          applDob: normalizedDob,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setError(
          data?.error ||
            "Status could not be retrieved. Please check the details and try again."
        );
        return;
      }

      setResult(data.result);
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function clearForm() {
    setFileNo("");
    setDob("");
    setResult(null);
    setError("");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">Passport Status</h1>
          <p className="mt-1 text-sm text-slate-500">
            Check live Passport Seva application status using File Number and Date of Birth.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={checkStatus} className="grid gap-4 md:grid-cols-[1fr_220px_auto_auto] md:items-end">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                File Number
              </label>
              <input
                value={fileNo}
                onChange={(e) => setFileNo(e.target.value.toUpperCase())}
                placeholder="KO5074949286226"
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Date of Birth
              </label>
              <input
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="DD/MM/YYYY"
                inputMode="numeric"
                autoComplete="bday"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Checking..." : "Check Status"}
            </button>

            <button
              type="button"
              onClick={clearForm}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Application Status</h2>
                <p className="text-xs text-slate-500">Live response from Passport Seva</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Live
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Application Reference" value={result.applicationReference} />
              <Info label="File Number" value={result.fileNumber} />
              <Info label="Applicant Name" value={result.applicantName} />
              <Info label="Date of Birth" value={result.dateOfBirth} />
              <Info label="Application Date" value={result.applicationDate} />
              <Info label="Application Type" value={result.applicationType} />
              <Info label="Last Modified" value={result.lastModifiedDate} />
              <Info label="Police Verification Office" value={result.policeVerificationOffice} />
              <Info label="SMS Code" value={result.smsCode} />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                Current Status
              </div>
              <div className="text-sm font-semibold leading-6 text-slate-900">
                {result.statusMessage || result.status || "Status available"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}
