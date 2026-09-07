 "use client";

import { FormEvent, useMemo, useState } from "react";

type CertificateOption = {
  name: string;
  code: string;
};

type Result = {
  applicationNumber: string;
  applicantName: string;
  serviceName: string;
  office: string;
  status: string;
};

const CERTIFICATES: CertificateOption[] = [
  { name: "Caste", code: "2" },
  { name: "Community", code: "1" },
  { name: "Domicile", code: "11" },
  { name: "Family Membership", code: "22" },
  { name: "Income", code: "4" },
  { name: "Legal Heir", code: "10" },
  { name: "Minority", code: "93" },
  { name: "Nativity", code: "6" },
  { name: "Non-Creamy Layer", code: "36" },
  { name: "Non-ReMarriage", code: "25" },
  { name: "One and the Same", code: "26" },
  { name: "Possession", code: "13" },
  { name: "Possession and Non-Attachment", code: "27" },
  { name: "Relationship", code: "8" },
];

export default function EdistrictCertificatePage() {
  const [certificateCode, setCertificateCode] = useState("4");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCertificate = useMemo(
    () => CERTIFICATES.find((item) => item.code === certificateCode)?.name ?? "",
    [certificateCode]
  );

  async function trackApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const applNo = applicationNumber.trim();
    if (!applNo) {
      setError("Please enter an application number.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/edistrict-certificate/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationNumber: applNo,
          serviceCode: certificateCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to fetch application status.");
      }

      if (!data.data) {
        setError(`No application was found for ${applNo}.`);
        return;
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch application status.");
    } finally {
      setLoading(false);
    }
  }

  function clearSearch() {
    setApplicationNumber("");
    setResult(null);
    setError("");
  }

  function printResult() {
    if (!result) return;

    // Submit the same POST form used by the official Kerala e-District
    // Print button. This lets the browser use its existing e-District
    // session/cookies instead of trying to recreate that session server-side.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://edistrict.kerala.gov.in/openSearch.pdf";
    form.target = "_blank";
    form.style.display = "none";

    const fields: Record<string, string> = {
      searchService: "qrPrint",
      applNo: result.applicationNumber,
      serviceCode: "",
      hiddenval: "",
      hiddenServiceType: "",
      srvceType: "RC",
      scode: "",
      applicationNo: "",
      token: "",
      ctypecheck: certificateCode,
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  return (
    <main className="edistrict-page">
      <style jsx global>{`
        .edistrict-page {
          min-height: calc(100vh - 60px);
          padding: 24px;
          background: #f3f9ff;
          color: #16324f;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .edistrict-shell {
          max-width: 1050px;
          margin: 0 auto;
        }
        .edistrict-header {
          margin-bottom: 20px;
        }
        .edistrict-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .edistrict-subtitle {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 14px;
        }
        .edistrict-card {
          background: #fff;
          border: 1px solid #dbeafe;
          border-radius: 16px;
          box-shadow: 0 8px 28px rgba(30, 64, 175, 0.08);
        }
        .edistrict-form {
          padding: 20px;
        }
        .edistrict-grid {
          display: grid;
          grid-template-columns: minmax(220px, 0.9fr) minmax(280px, 1.4fr) auto;
          gap: 14px;
          align-items: end;
        }
        .edistrict-label {
          display: block;
          margin-bottom: 7px;
          font-size: 12px;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .edistrict-input,
        .edistrict-select {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 0 12px;
          background: #fff;
          color: #0f172a;
          font-size: 14px;
          outline: none;
        }
        .edistrict-input:focus,
        .edistrict-select:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
        }
        .edistrict-actions {
          display: flex;
          gap: 8px;
        }
        .edistrict-button {
          height: 44px;
          border: 0;
          border-radius: 9px;
          padding: 0 18px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .edistrict-track {
          background: #2563eb;
          color: white;
        }
        .edistrict-track:disabled {
          opacity: 0.65;
          cursor: wait;
        }
        .edistrict-clear {
          background: #e2e8f0;
          color: #334155;
        }
        .edistrict-source {
          margin-top: 10px;
          font-size: 12px;
          color: #64748b;
        }
        .edistrict-error {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          font-size: 14px;
        }
        .edistrict-result {
          margin-top: 18px;
          overflow: hidden;
        }
        .edistrict-result-top {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
        }
        .edistrict-name {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
        }
        .edistrict-badge {
          display: inline-flex;
          margin-top: 7px;
          padding: 5px 9px;
          border-radius: 999px;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 800;
        }
        .edistrict-status {
          padding: 10px 14px;
          border-radius: 10px;
          background: #ecfdf5;
          color: #047857;
          font-size: 14px;
          font-weight: 800;
          text-align: right;
        }
        .edistrict-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: #e2e8f0;
        }
        .edistrict-meta-item {
          background: #fff;
          padding: 16px 20px;
        }
        .edistrict-meta-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .edistrict-meta-value {
          margin-top: 5px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
        }
        .edistrict-print-button {
          margin: 16px 20px 20px;
          height: 40px;
          border: 0;
          border-radius: 8px;
          padding: 0 16px;
          background: #0f766e;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }
        .edistrict-print-button:hover {
          background: #115e59;
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .edistrict-print-area,
          .edistrict-print-area * {
            visibility: visible !important;
          }
          .edistrict-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .edistrict-print-button {
            display: none !important;
          }
        }
        @media (max-width: 800px) {
          .edistrict-page { padding: 14px; }
          .edistrict-grid { grid-template-columns: 1fr; }
          .edistrict-actions { width: 100%; }
          .edistrict-button { flex: 1; }
          .edistrict-result-top { align-items: flex-start; flex-direction: column; }
          .edistrict-status { text-align: left; }
          .edistrict-meta { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .edistrict-meta { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="edistrict-shell">
        <header className="edistrict-header">
          <h1 className="edistrict-title">Kerala e-District</h1>
          <p className="edistrict-subtitle">
            Certificate application status tracker
          </p>
        </header>

        <section className="edistrict-card edistrict-form">
          <form onSubmit={trackApplication}>
            <div className="edistrict-grid">
              <div>
                <label className="edistrict-label" htmlFor="certificateType">
                  Certificate Type
                </label>
                <select
                  id="certificateType"
                  className="edistrict-select"
                  value={certificateCode}
                  onChange={(event) => setCertificateCode(event.target.value)}
                >
                  {CERTIFICATES.map((certificate) => (
                    <option key={certificate.code} value={certificate.code}>
                      {certificate.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="edistrict-label" htmlFor="applicationNumber">
                  Application Number
                </label>
                <input
                  id="applicationNumber"
                  className="edistrict-input"
                  value={applicationNumber}
                  onChange={(event) => setApplicationNumber(event.target.value)}
                  placeholder="Enter application number"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              <div className="edistrict-actions">
                <button className="edistrict-button edistrict-track" type="submit" disabled={loading}>
                  {loading ? "Checking..." : "Check Status"}
                </button>
                <button className="edistrict-button edistrict-clear" type="button" onClick={clearSearch}>
                  Clear
                </button>
              </div>
            </div>
          </form>

          <div className="edistrict-source">
            Live status source: Kerala Government e-District • Selected service: {selectedCertificate}
          </div>

          {error && <div className="edistrict-error">{error}</div>}
        </section>

        {result && (
          <section className="edistrict-card edistrict-result edistrict-print-area">
            <div className="edistrict-result-top">
              <div>
                <h2 className="edistrict-name">{result.applicantName || "Applicant"}</h2>
                <span className="edistrict-badge">
                  APP #{result.applicationNumber}
                </span>
              </div>
              <div className="edistrict-status">{result.status || "Status available"}</div>
            </div>

            <div className="edistrict-meta">
              <div className="edistrict-meta-item">
                <div className="edistrict-meta-label">Application Number</div>
                <div className="edistrict-meta-value">{result.applicationNumber}</div>
              </div>
              <div className="edistrict-meta-item">
                <div className="edistrict-meta-label">Service</div>
                <div className="edistrict-meta-value">{result.serviceName || selectedCertificate}</div>
              </div>
              <div className="edistrict-meta-item">
                <div className="edistrict-meta-label">Office</div>
                <div className="edistrict-meta-value">{result.office || "—"}</div>
              </div>
            </div>

            {result.status.trim().toLowerCase() === "approved" && (
              <button
                className="edistrict-print-button"
                type="button"
                onClick={printResult}
              >
                Print
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
