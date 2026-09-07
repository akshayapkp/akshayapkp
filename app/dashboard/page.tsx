"use client";

import SSLCCalculatorTool from "./tools/SSLCCalculatorTool";
import CashCounterTool from "./tools/CashCounterTool";
import PassportSize from "./tools/PassportSize";
import CropResizeTool from "./tools/CropResizeTool";
import PSCPhotoTool from "./tools/PSCPhotoTool";
import PDFToolkitTool from "./tools/PDFTool";
import LandAreaConverterTool from "./tools/ConverterTool";
import ImageToTextTool from "./tools/ImageToText";
import CalculatorTool from "./tools/calculatol";
import ResumeBuilder from "./tools/ResumeBuilder";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FileText,
  Wallet,
  Search,
  DollarSign,
  ArrowUpRight,
  Bell,
  History,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Settings,
  GripHorizontal,
  Save,
  ClipboardCheck,
  ScrollText,
  ArrowLeft,
} from "lucide-react";

interface WalletItem {
  id: string;
  name: string;
  openingBalance: number;
  currentBalance: number;
  lastUpdated: string;
}

interface ServiceItem {
  id?: string;
  title?: string;
  name?: string;
  serviceName?: string;
  url?: string;
  webUrl?: string;
  link?: string;
  note?: string;
}

interface QuickLinkItem {
  id: number | string;
  name: string;
  url: string;
  bgColor: string;
  isInternal: boolean;
}

const CENTRAL_STORAGE_ROW_ID = 999999;
const CENTRAL_STORAGE_KEY = "__smart_akshaya_shared_storage__";

interface LatestEntry {
  billId: string;
  staffName: string;
  customerName: string;
  phone: string;
  serviceName: string;
  totalAmount: number;
  totalPaid: number;
  balance: number;
  dateTime: string;
  timestamp: string;
}

const parseArray = (value: any): any[] => {
  if (!Array.isArray(value)) return [];
  return value;
};

const readLocalArray = (key: string): any[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadCentralDashboardStore = async (): Promise<Record<string, any[]> | null> => {
  try {
    // Central storage is only a shared-sync layer. The dashboard must never
    // crash or open the Next.js error overlay when the row is unavailable,
    // blocked by RLS, or temporarily unreachable. Local storage remains the
    // safe fallback inside refreshLatestEntry().
    const { data, error } = await supabase
      .from("feature_permissions")
      .select("id, permissions")
      .eq("id", CENTRAL_STORAGE_ROW_ID)
      .limit(1);

    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    const payload = data[0]?.permissions;
    if (!payload || typeof payload !== "object") return null;
    if (payload.storageKey && payload.storageKey !== CENTRAL_STORAGE_KEY) return null;

    return payload.data && typeof payload.data === "object"
      ? payload.data as Record<string, any[]>
      : null;
  } catch {
    // Never surface a central-storage read problem to the UI.
    return null;
  }
};


/* Status Center embedded tools: no iframe, no nested Dashboard/sidebar. */
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

function StatusEdistrictTool() {
  const [certificateCode, setCertificateCode] = useState("4");
  const [applicationNumber, setApplicationNumber] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCertificate = React.useMemo(
    () => CERTIFICATES.find((item) => item.code === certificateCode)?.name ?? "",
    [certificateCode]
  );

  async function trackApplication(event: React.FormEvent<HTMLFormElement>) {
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
          min-height: 0;
          padding: 22px;
          background: #f3f9ff;
          color: #16324f;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .edistrict-shell {
          max-width: 1050px;
          margin: 0 auto;
        }
        .edistrict-header {
          margin-bottom: 14px;
        }
        .edistrict-title {
          margin: 0;
          font-size: 24px;
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
          padding: 16px;
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

            <button
              className="edistrict-print-button"
              type="button"
              onClick={printResult}
            >
              Print
            </button>
          </section>
        )}
      </div>
    </main>
  );
}


type SearchType = "applicationNumber" | "mobileNumber" | "name";

type GazetteResult = {
  applicationNumber: string;
  applicantName: string;
  applicationDate: string;
  applicationType: string;
  internalId: string;
  status: string;
  gazetteNumber: string;
  gazetteYear: string;
};

const SEARCH_OPTIONS: {
  value: SearchType;
  label: string;
}[] = [
  { value: "applicationNumber", label: "Application Number" },
  { value: "mobileNumber", label: "Mobile Number" },
  { value: "name", label: "Name" },
];

function StatusGazetteTool() {
  const [searchType, setSearchType] =
    useState<SearchType>("applicationNumber");
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<GazetteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getPlaceholder = () => {
    if (searchType === "applicationNumber") return "e.g. 17846";
    if (searchType === "mobileNumber") return "e.g. 9633105245";
    return "e.g. JAMSHEER";
  };

  const getHint = () => {
    if (searchType === "applicationNumber") {
      return "Enter your Kerala COMPOSE citizen service application number.";
    }
    if (searchType === "mobileNumber") {
      return "Enter the mobile number used for the Kerala COMPOSE application.";
    }
    return "Enter the applicant name as used in the Kerala COMPOSE application.";
  };

  const handleSearchTypeChange = (value: SearchType) => {
    setSearchType(value);
    setSearchValue("");
    setResults([]);
    setError("");
  };

  const trackApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const value = searchValue.trim();
    if (!value) {
      setError(`Please enter a ${searchType === "applicationNumber"
        ? "Application Number"
        : searchType === "mobileNumber"
          ? "Mobile Number"
          : "Name"
      }.`);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch("/api/kerala-gazette/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchType,
          searchValue: value,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Unable to fetch application status."
        );
      }

      const apiResults = Array.isArray(data.results)
        ? data.results
        : data.data
          ? [data.data]
          : [];

      if (apiResults.length === 0) {
        setError(`No application was found for ${value}.`);
        return;
      }

      setResults(
        apiResults.map((result: any) => ({
          applicationNumber: String(result.applicationNumber ?? ""),
          applicantName: String(result.applicantName ?? ""),
          applicationDate: String(result.applicationDate ?? ""),
          applicationType: String(result.applicationType ?? ""),
          internalId: String(result.internalId ?? ""),
          status: String(
            result.status ?? "Application status available"
          ),
          gazetteNumber: String(result.gazetteNumber ?? ""),
          gazetteYear: String(result.gazetteYear ?? ""),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to fetch the application status."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="gazette-page">
      <div className="gazette-container">
        <header className="gazette-header">
          <span className="gazette-emblem">Government of Kerala</span>
          <h1>Kerala Gazette</h1>
          <p className="gazette-subtitle">
            Citizen Services — Application Status Tracker
          </p>
        </header>

        <section className="gazette-card">
          <div className="gazette-card-label">Track Application</div>

          <div className="gazette-search-options" role="radiogroup" aria-label="Search by">
            {SEARCH_OPTIONS.map((option) => (
              <label key={option.value} className="gazette-radio">
                <input
                  type="radio"
                  name="gazette-search-type"
                  value={option.value}
                  checked={searchType === option.value}
                  onChange={() => handleSearchTypeChange(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <form className="gazette-input-group" onSubmit={trackApplication}>
            <input
              type="text"
              inputMode={
                searchType === "applicationNumber" || searchType === "mobileNumber"
                  ? "numeric"
                  : "text"
              }
              value={searchValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchValue(
                  searchType === "applicationNumber" ||
                    searchType === "mobileNumber"
                    ? nextValue.replace(/\D/g, "")
                    : nextValue
                );
              }}
              placeholder={getPlaceholder()}
              required
              autoFocus
              aria-label={SEARCH_OPTIONS.find(
                (option) => option.value === searchType
              )?.label}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Track →"}
            </button>
          </form>

          <p className="gazette-hint">{getHint()}</p>
        </section>

        {error && <div className="gazette-error">{error}</div>}

        {results.map((result, index) => (
          <section
            className="gazette-result-card"
            key={`${result.applicationNumber}-${result.internalId}-${index}`}
          >
            <h2 className="gazette-applicant-name">
              {result.applicantName || "Applicant"}
            </h2>

            <span className="gazette-app-id">
              APP #{result.applicationNumber || "—"}
            </span>

            <div className="gazette-status-banner">
              {result.status || "Application status available"}
            </div>

            {result.gazetteNumber &&
              result.gazetteYear &&
              /published/i.test(result.status) && (
              <a
                className="gazette-print-button"
                href={`https://compose.kerala.gov.in/kgCitizenServicefiledownloadpdf?gztnotemp=${encodeURIComponent(result.gazetteNumber)}&gztyeartemp=${encodeURIComponent(result.gazetteYear)}&dstid=&tlkid=&department=&partid=14`}
                target="_blank"
                rel="noreferrer"
              >
                Print Gazette Notification
              </a>
            )}

            <dl className="gazette-meta-grid">
              <div className="gazette-meta-item">
                <dt>Application Date</dt>
                <dd>{result.applicationDate || "—"}</dd>
              </div>

              <div className="gazette-meta-item">
                <dt>Application Type</dt>
                <dd>{result.applicationType || "—"}</dd>
              </div>

              <div className="gazette-meta-item">
                <dt>Internal ID</dt>
                <dd>{result.internalId || "—"}</dd>
              </div>

              <div className="gazette-meta-item">
                <dt>Source</dt>
                <dd>Kerala COMPOSE</dd>
              </div>
            </dl>

            <hr className="gazette-divider" />

            <div className="gazette-source">
              Live status fetched from{" "}
              <a
                href="https://compose.kerala.gov.in"
                target="_blank"
                rel="noreferrer"
              >
                compose.kerala.gov.in
              </a>
            </div>
          </section>
        ))}

        <footer className="gazette-footer">
          Kerala Gazette Citizen Services Status Tracker
        </footer>
      </div>

      <style jsx>{`
        .gazette-page {
          min-height: 100vh;
          background: #f7f9fd;
          color: #1e2d3d;
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          padding: 48px 20px 72px;
        }

        .gazette-container {
          width: 100%;
          max-width: none;
          margin: 0 auto;
        }

        .gazette-header {
          margin-bottom: 32px;
        }

        .gazette-emblem {
          display: block;
          margin-bottom: 10px;
          color: #4a90d9;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2.5px;
          text-transform: uppercase;
        }

        h1 {
          margin: 0 0 5px;
          color: #1e2d3d;
          font-size: 28px;
          font-weight: 650;
          letter-spacing: -0.6px;
        }

        .gazette-subtitle {
          margin: 0;
          color: #7a95b0;
          font-size: 13px;
        }

        .gazette-card,
        .gazette-result-card {
          margin-bottom: 18px;
          overflow: hidden;
          border: 1px solid #d6e6f5;
          border-radius: 12px;
          background: #ffffff;
        }

        .gazette-card {
          padding: 25px 26px 21px;
        }

        .gazette-card-label {
          margin-bottom: 13px;
          color: #7a95b0;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .gazette-search-options {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 18px;
          margin-bottom: 16px;
        }

        .gazette-radio {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #48637d;
          font-size: 13px;
          font-weight: 550;
          cursor: pointer;
          user-select: none;
        }

        .gazette-radio input {
          width: 15px;
          height: 15px;
          margin: 0;
          accent-color: #4a90d9;
          cursor: pointer;
        }

        .gazette-input-group {
          display: flex;
          gap: 10px;
        }

        .gazette-input-group input {
          min-width: 0;
          flex: 1;
          border: 1.5px solid #d6e6f5;
          border-radius: 8px;
          outline: none;
          background: #f7f9fd;
          color: #1e2d3d;
          padding: 11px 15px;
          font: inherit;
          font-size: 15px;
          font-weight: 500;
        }

        .gazette-input-group input::placeholder {
          color: #7a95b0;
          font-weight: 400;
        }

        .gazette-input-group input:focus {
          border-color: #4a90d9;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.12);
        }

        .gazette-input-group button {
          border: 0;
          border-radius: 8px;
          background: #4a90d9;
          color: #ffffff;
          padding: 11px 22px;
          font: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .gazette-input-group button:hover:not(:disabled) {
          background: #2c6fad;
        }

        .gazette-input-group button:disabled {
          cursor: wait;
          opacity: 0.7;
        }

        .gazette-hint {
          margin: 9px 0 0;
          color: #7a95b0;
          font-size: 12px;
        }

        .gazette-error {
          margin-bottom: 18px;
          border: 1px solid #f5c6c6;
          border-radius: 8px;
          background: #fff0f0;
          color: #b84f4f;
          padding: 13px 16px;
          font-size: 14px;
        }

        .gazette-result-card {
          padding: 27px;
        }

        .gazette-applicant-name {
          margin: 0 0 6px;
          color: #1e2d3d;
          font-size: 23px;
          font-weight: 650;
          letter-spacing: -0.35px;
        }

        .gazette-app-id {
          display: inline-block;
          margin-bottom: 21px;
          border-radius: 20px;
          background: #daeaf8;
          color: #2c6fad;
          padding: 3px 12px;
          font-size: 11px;
          font-weight: 650;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .gazette-status-banner {
          margin-bottom: 23px;
          border-left: 3px solid #4a90d9;
          border-radius: 0 8px 8px 0;
          background: #daeaf8;
          color: #2c6fad;
          padding: 13px 15px;
          font-size: 14px;
          font-weight: 550;
          line-height: 1.5;
        }

        .gazette-print-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin: -7px 0 24px;
          border-radius: 8px;
          background: #4a90d9;
          color: #ffffff;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
        }

        .gazette-print-button:hover {
          background: #2c6fad;
        }

        .gazette-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px 24px;
          margin: 0;
        }

        .gazette-meta-item dt {
          margin-bottom: 3px;
          color: #7a95b0;
          font-size: 10px;
          font-weight: 650;
          letter-spacing: 1.7px;
          text-transform: uppercase;
        }

        .gazette-meta-item dd {
          margin: 0;
          color: #1e2d3d;
          font-size: 14px;
          font-weight: 550;
          overflow-wrap: anywhere;
        }

        .gazette-divider {
          margin: 22px 0 15px;
          border: 0;
          border-top: 1px solid #d6e6f5;
        }

        .gazette-source {
          color: #7a95b0;
          font-size: 12px;
          line-height: 1.7;
        }

        .gazette-source a {
          color: #4a90d9;
          text-decoration: none;
        }

        .gazette-source a:hover {
          text-decoration: underline;
        }

        .gazette-footer {
          margin-top: 38px;
          color: #7a95b0;
          text-align: center;
          font-size: 12px;
        }

        @media (max-width: 560px) {
          .gazette-page {
            padding: 30px 14px 50px;
          }

          .gazette-card,
          .gazette-result-card {
            padding: 20px;
          }

          .gazette-search-options {
            flex-direction: column;
            gap: 10px;
          }

          .gazette-input-group {
            flex-direction: column;
          }

          .gazette-input-group button {
            width: 100%;
          }

          .gazette-meta-grid {
            grid-template-columns: 1fr;
            gap: 15px;
          }
        }
      `}</style>
    </main>
  );
}


export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState({
    username: "Admin User",
    role: "admin",
  });

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [todayEntriesCount, setTodayEntriesCount] = useState(0);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [totalCashCollection, setTotalCashCollection] = useState(0);

  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [showUpdateBubble, setShowUpdateBubble] = useState(false);

  // Pending credit summary shown inside the attendance popup for the
  // currently logged-in staff/accountant.
  const [pendingCreditBills, setPendingCreditBills] = useState<any[]>([]);
  const [showAllPendingCredits, setShowAllPendingCredits] = useState(false);

  // Popup States for Tools
  const [showCashCounterModal, setShowCashCounterModal] = useState(false);
  const [showSslcModal, setShowSslcModal] = useState(false);
  const [showCropResizeModal, setShowCropResizeModal] = useState(false);
  const [showPassportToolModal, setShowPassportToolModal] = useState(false);
  const [showPscModal, setShowPscModal] = useState(false);
  const [showPdfToolkitModal, setShowPdfToolkitModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [showImageToTextModal, setShowImageToTextModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showResumeBuilderModal, setShowResumeBuilderModal] = useState(false);
  const [showServiceDirectory, setShowServiceDirectory] = useState(false);
  const [statusCenterView, setStatusCenterView] = useState<"center" | "edistrict" | "gazette" | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const draggedItemIndex = useRef<number | null>(null);
  const draggedOverItemIndex = useRef<number | null>(null);

  const currentVersion = "1.0.0";
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [isLatestEntryOpen, setIsLatestEntryOpen] = useState(false);
  const [latestEntry, setLatestEntry] = useState<LatestEntry | null>(null);
  const [latestEntryStaff, setLatestEntryStaff] = useState("ALL");
  const [latestEntryStaffList, setLatestEntryStaffList] = useState<string[]>([]);
  const [latestEntryLoading, setLatestEntryLoading] = useState(false);
  const latestEntryRef = useRef<HTMLDivElement>(null);
  const latestEntryButtonRef = useRef<HTMLButtonElement>(null);
  const [latestEntryPopupPosition, setLatestEntryPopupPosition] = useState({ top: 0, left: 0 });

  // Latest Billed Entry visibility follows the Feature Permissions page.
  // The two permissions are independent: Accountant Access controls Accountant/
  // Account Staff users, while Staff Access controls Staff users.
  const [latestEntryPermission, setLatestEntryPermission] = useState({
    accountantAccess: true,
    staffAccess: true,
  });

  const STATUS_QUICK_LINK: QuickLinkItem = {
    id: 12,
    name: "Status",
    url: "status-center",
    bgColor: "from-blue-600 to-cyan-600",
    isInternal: true,
  };

  const [quickLinks, setQuickLinks] = useState<QuickLinkItem[]>([
    {
      id: 1,
      name: "SSLC Percentage",
      url: "sslc-modal",
      bgColor: "from-purple-500 to-purple-600",
      isInternal: true,
    },
    {
      id: 3,
      name: "Crop & Resize",
      url: "crop-resize-modal",
      bgColor: "from-pink-500 to-pink-600",
      isInternal: true,
    },
    {
      id: 4,
      name: "PSC Creator",
      url: "psc-modal",
      bgColor: "from-teal-500 to-teal-700",
      isInternal: true,
    },
    {
      id: 5,
      name: "Calculator",
      url: "calculator-modal",
      bgColor: "from-amber-500 to-amber-600",
      isInternal: true,
    },
    {
      id: 6,
      name: "Cash Counter",
      url: "cash-counter-modal",
      bgColor: "from-emerald-500 to-emerald-600",
      isInternal: true,
    },
    {
      id: 7,
      name: "Passport Size",
      url: "passport-size-modal",
      bgColor: "from-rose-500 to-pink-600",
      isInternal: true,
    },
    {
      id: 8,
      name: "PDF Tool",
      url: "pdf-toolkit-modal",
      bgColor: "from-indigo-600 to-violet-700",
      isInternal: true,
    },
    {
      id: 9,
      name: "Converter Tool",
      url: "converter-modal",
      bgColor: "from-emerald-500 to-green-700",
      isInternal: true,
    },
    {
      id: 10,
      name: "Image To Text",
      url: "image-to-text-modal",
      bgColor: "from-orange-500 to-red-600",
      isInternal: true,
    },
    {
  id: 11,
  name: "Resume Builder",
  url: "resume-builder-modal",
  bgColor: "from-cyan-500 to-blue-600",
  isInternal: true,
},
  ]);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [serviceDirectory, setServiceDirectory] = useState<ServiceItem[]>([]);

  const router = useRouter();

  useEffect(() => {
const loadDashboardData = () => {
  try {
    const savedWallets = localStorage.getItem("managedWallets");

    if (savedWallets) {
      const parsedWallets = JSON.parse(savedWallets);

      setWallets(
        parsedWallets.map((wallet: any) => ({
          ...wallet,
          openingBalance: Number(wallet.openingBalance || 0),
          currentBalance: Number(wallet.currentBalance || 0),
        }))
      );
    } else {
      setWallets([]);
    }
  } catch (err) {
    console.error("Wallet load failed:", err);
    setWallets([]);
  }
      const savedBills = localStorage.getItem("savedBills");
      if (savedBills) {
        try {
          const bills = JSON.parse(savedBills);
          setTodayEntriesCount(bills.length);
          setCompletedTodayCount(bills.length);
          const totalCash = bills.reduce(
            (acc: number, curr: any) =>
              acc + (Number(curr.totalAmount) || Number(curr.amount) || 0),
            0
          );
          setTotalCashCollection(totalCash);
        } catch (e) {}
      }

      const savedQuickLinksOrder = localStorage.getItem("dashboard_quick_links_order");
      let baseTools = quickLinks;
      if (savedQuickLinksOrder) {
        try {
          const parsedOrder = JSON.parse(savedQuickLinksOrder);
          if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
            baseTools = parsedOrder;
          }
        } catch (e) {}
      }

      // Keep the Status Center card available even when an older
      // saved dashboard layout does not contain it yet.
      if (!baseTools.some((item: any) => String(item?.url || "") === "status-center")) {
        baseTools = [...baseTools, STATUS_QUICK_LINK];
      }

      const customHubLinks = localStorage.getItem("hub_quick_links");
      if (customHubLinks) {
        try {
          const parsedCustom = JSON.parse(customHubLinks);
          const formattedCustom = parsedCustom.map((item: any) => ({
            id: item.id || Date.now() + Math.random(),
            name: item.name || "External Tool",
            url: item.url || "#",
            bgColor: "from-indigo-500 to-violet-600",
            isInternal: false,
          }));
          setQuickLinks([...baseTools, ...formattedCustom]);
        } catch (e) {
          setQuickLinks(baseTools);
        }
      } else {
        setQuickLinks(baseTools);
      }

// REPLACE ONLY THIS BLOCK

let loadedServices: any[] = [];

const savedManagedServices = localStorage.getItem("managedServices");

if (savedManagedServices) {
  try {
    const parsedServices = JSON.parse(savedManagedServices);

    if (Array.isArray(parsedServices)) {
      loadedServices = parsedServices;
    }
  } catch (err) {
    console.error("Error loading managedServices:", err);
  }
}

const filteredWithUrls = loadedServices
  .filter(
    (service: any) =>
      service.portalUrl &&
      service.portalUrl.trim() !== ""
  )
  .map((service: any) => ({
    id: service.id,
    title: service.name,
    url: service.portalUrl,
    note: service.portalUrl.replace(/^https?:\/\//, ""),
  }));

setServiceDirectory(filteredWithUrls);
    };

    loadDashboardData();

    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setTodayDate(
        now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    const storedUser = localStorage.getItem("loggedInUser");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser({
          username: parsed.username || "Admin User",
          role: parsed.role || "staff",
        });

        // Restore the attendance-time credit overview. Only pending credit
        // bills belonging to the logged-in user are shown. Different versions
        // of the billing data used different staff identity field names, so
        // compare all known identity fields without changing the stored data.
        try {
          const savedCreditBills = JSON.parse(
            localStorage.getItem("smart_akshaya_bills") || "[]"
          );

          const normalizeStaffValue = (value: unknown) =>
            String(value ?? "")
              .trim()
              .replace(/\s+/g, " ")
              .toLowerCase();

          const loggedInUserValues = [
            parsed.username,
            parsed.name,
            parsed.fullName,
            parsed.displayName,
            parsed.staffName,
          ]
            .map(normalizeStaffValue)
            .filter(Boolean);

          if (Array.isArray(savedCreditBills)) {
            const ownPendingCredits = savedCreditBills
              .filter((bill: any) => {
                if (Number(bill?.owedAmount || 0) <= 0) return false;

                const billStaffValues = [
                  bill?.staffName,
                  bill?.staff,
                  bill?.staffUsername,
                  bill?.username,
                  bill?.createdBy,
                  bill?.employeeName,
                ]
                  .map((value) => {
                    if (value && typeof value === "object") {
                      return [
                        value.username,
                        value.name,
                        value.fullName,
                        value.displayName,
                        value.staffName,
                      ]
                        .map(normalizeStaffValue)
                        .filter(Boolean);
                    }
                    return [normalizeStaffValue(value)].filter(Boolean);
                  })
                  .flat();

                return billStaffValues.some((billStaff: string) =>
                  loggedInUserValues.includes(billStaff)
                );
              })
              .sort((a: any, b: any) => {
                const aTime = new Date(
                  a?.dateTime || a?.date || a?.createdAt || 0
                ).getTime();
                const bTime = new Date(
                  b?.dateTime || b?.date || b?.createdAt || 0
                ).getTime();
                return Number.isFinite(aTime) && Number.isFinite(bTime)
                  ? bTime - aTime
                  : 0;
              });

            setPendingCreditBills(ownPendingCredits);
          } else {
            setPendingCreditBills([]);
          }
        } catch {
          setPendingCreditBills([]);
        }

        const logs = JSON.parse(localStorage.getItem("staff_attendance_logs") || "[]");
        const today = new Date().toISOString().split("T")[0];
        const alreadyMarked = logs.some(
          (log: any) =>
            log.staffName?.toLowerCase() === (parsed.username || "").toLowerCase() &&
            new Date(log.timestamp || log.date).toISOString().split("T")[0] === today
        );
        if (!alreadyMarked) setShowAttendancePopup(true);

        const savedVersion = localStorage.getItem("smart_akshaya_app_version") || "1.0.0";
        if (savedVersion !== currentVersion) setShowUpdateBubble(true);

        const savedAnnouncements = localStorage.getItem("hub_announcements");
        if (savedAnnouncements) {
          const parsedAnnouncements = JSON.parse(savedAnnouncements);
          const username = parsed.username || "Admin User";
          const hiddenKey = `hidden_notifications_${username}`;
          const hiddenIds = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
          const filtered = parsedAnnouncements.filter((item: any) => {
            if (hiddenIds.includes(item.id)) return false;
            if (item.targetAll) return true;
            return item.selectedStaff?.includes(username);
          });
          setAnnouncements(filtered);
        }
      } catch (err) {}
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }

      if (latestEntryRef.current && !latestEntryRef.current.contains(target)) {
        const insideLatestPopup = (target as HTMLElement)?.closest?.("[data-latest-entry-popup]");
        if (!insideLatestPopup) setIsLatestEntryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!isLatestEntryOpen) return;

    const updateLatestEntryPopupPosition = () => {
      const button = latestEntryButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const popupWidth = Math.min(416, window.innerWidth - 24);
      const gap = 8;
      const sidePadding = 12;

      let left = rect.right - popupWidth;
      left = Math.max(sidePadding, Math.min(left, window.innerWidth - popupWidth - sidePadding));

      const top = rect.bottom + gap;
      setLatestEntryPopupPosition({ top, left });
    };

    const frame = window.requestAnimationFrame(updateLatestEntryPopupPosition);
    window.addEventListener("resize", updateLatestEntryPopupPosition);
    window.addEventListener("scroll", updateLatestEntryPopupPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateLatestEntryPopupPosition);
      window.removeEventListener("scroll", updateLatestEntryPopupPosition, true);
    };
  }, [isLatestEntryOpen]);

  const refreshLatestEntry = async (requestedStaff = latestEntryStaff) => {
    setLatestEntryLoading(true);

    try {
      const localPerformance = readLocalArray("performanceRecords");
      const localServices = readLocalArray("serviceEntries");
      const localDeleted = new Set(readLocalArray("deletedBillIds").map(String));

      let remoteStore: Record<string, any[]> | null = null;
      try {
        remoteStore = await loadCentralDashboardStore();
      } catch {
        remoteStore = null;
      }

      const performanceRecords = parseArray(remoteStore?.performanceRecords).length
        ? parseArray(remoteStore?.performanceRecords)
        : localPerformance;

      const serviceEntries = parseArray(remoteStore?.serviceEntries).length
        ? parseArray(remoteStore?.serviceEntries)
        : localServices;

      const mergedPerformance = new Map<string, any>();

      [...performanceRecords, ...localPerformance].forEach((record: any, index: number) => {
        if (!record || typeof record !== "object") return;

        const key = String(
          record.billId ||
          record.id ||
          `${record.staffName || "staff"}-${record.timestamp || record.date || index}`
        );

        if (!mergedPerformance.has(key)) {
          mergedPerformance.set(key, record);
        }
      });

      const mergedServices = new Map<string, any>();
      [...serviceEntries, ...localServices].forEach((entry: any, index: number) => {
        if (!entry || typeof entry !== "object") return;

        const key = String(
          entry.id ||
          `${entry.billId || "bill"}-${entry.serviceName || entry.service || "service"}-${index}`
        );

        if (!mergedServices.has(key)) {
          mergedServices.set(key, entry);
        }
      });

      const allServices = Array.from(mergedServices.values());

      const staffNames = Array.from(
        new Set(
          Array.from(mergedPerformance.values())
            .map((record: any) => String(record.staffName || record.staff || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setLatestEntryStaffList(staffNames);

      const candidates = Array.from(mergedPerformance.values())
        .filter((record: any) => {
          const billKey = String(record.billId || record.id || "").trim();
          if (billKey && localDeleted.has(billKey)) return false;

          const staffName = String(record.staffName || record.staff || "").trim();
          return requestedStaff === "ALL" || staffName === requestedStaff;
        })
        .sort((a: any, b: any) => {
          const aTime = new Date(a.timestamp || a.createdAt || a.dateTime || a.date || 0).getTime();
          const bTime = new Date(b.timestamp || b.createdAt || b.dateTime || b.date || 0).getTime();
          return bTime - aTime;
        });

      const latest = candidates[0];

      if (!latest) {
        setLatestEntry(null);
        return;
      }

      const billId = String(latest.billId || latest.id || "").trim();

      const billServices = allServices.filter(
        (entry: any) =>
          String(entry.billId || entry.billID || entry.invoiceId || "").trim() === billId
      );

      const uniqueServiceNames = Array.from(
        new Set(
          billServices
            .map((entry: any) => String(entry.serviceName || entry.service || entry.name || "").trim())
            .filter(Boolean)
        )
      );

      const serviceName =
        uniqueServiceNames.length > 0
          ? uniqueServiceNames.join(" + ")
          : String(latest.serviceName || latest.service || "Service");

      const calculatedServiceTotal = billServices.reduce(
        (sum: number, entry: any) =>
          sum + (Number(entry.totalAmount) || Number(entry.total) || 0),
        0
      );

      setLatestEntry({
        billId,
        staffName: String(latest.staffName || latest.staff || "Admin"),
        customerName: String(latest.customerName || latest.name || "Walk-in"),
        phone: String(latest.phone || latest.customerPhone || latest.mobile || "-"),
        serviceName,
        totalAmount: Number(latest.totalAmount) || calculatedServiceTotal || 0,
        totalPaid: Number(latest.totalPaid ?? latest.paidAmount ?? latest.receivedAmount) || 0,
        balance: Number(latest.balance ?? latest.owedAmount ?? latest.pendingAmount) || 0,
        dateTime: String(latest.dateTime || latest.date || latest.timestamp || "-"),
        timestamp: String(latest.timestamp || latest.createdAt || latest.dateTime || latest.date || ""),
      });
    } catch (error) {
      console.error("Failed to load latest billed entry:", error);
      setLatestEntry(null);
    } finally {
      setLatestEntryLoading(false);
    }
  };

  const handleLatestEntryToggle = async () => {
    const nextOpen = !isLatestEntryOpen;
    setIsLatestEntryOpen(nextOpen);

    if (nextOpen) {
      await refreshLatestEntry("ALL");
    }
  };

  const handleLatestEntryStaffChange = async (staff: string) => {
    setLatestEntryStaff(staff);
    await refreshLatestEntry(staff);
  };

  const handleClearAllNotifications = () => {
    const username = currentUser.username;
    const hiddenKey = `hidden_notifications_${username}`;
    const hiddenIds = announcements.map((item) => item.id);
    localStorage.setItem(hiddenKey, JSON.stringify(hiddenIds));
    setAnnouncements([]);
  };

  const handleDragSort = () => {
    if (draggedItemIndex.current !== null && draggedOverItemIndex.current !== null) {
      const newQuickLinks = [...quickLinks];
      const draggedItemContent = newQuickLinks[draggedItemIndex.current];
      newQuickLinks.splice(draggedItemIndex.current, 1);
      newQuickLinks.splice(draggedOverItemIndex.current, 0, draggedItemContent);
      draggedItemIndex.current = null;
      draggedOverItemIndex.current = null;
      setQuickLinks(newQuickLinks);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadLatestEntryPermission = async () => {
      try {
        const { data, error } = await supabase
          .from("feature_permissions")
          .select("permissions")
          .eq("id", 1)
          .maybeSingle();

        if (error || !data?.permissions || cancelled) return;

        const permissions = Array.isArray(data.permissions)
          ? data.permissions
          : [];

        const latestPermission = permissions.find(
          (item: any) =>
            item?.featureName === "Latest Billed Entry" ||
            String(item?.id) === "17"
        );

        if (latestPermission) {
          setLatestEntryPermission({
            accountantAccess: latestPermission.accountantAccess !== false,
            staffAccess: latestPermission.staffAccess !== false,
          });
        }
      } catch {
        // Keep the existing default access if permissions cannot be read.
      }
    };

    loadLatestEntryPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveLayout = () => {
    localStorage.setItem("dashboard_quick_links_order", JSON.stringify(quickLinks));
    setIsCustomizing(false);
  };

  const netWalletBalance = wallets.reduce((acc, curr) => acc + curr.currentBalance, 0);
  const isAdmin = currentUser.role.toLowerCase().trim() === "admin";
  const normalizedRole = currentUser.role.toLowerCase().trim();
  const isAccountantRole =
    normalizedRole === "accountant" ||
    normalizedRole === "account" ||
    normalizedRole === "accounts" ||
    normalizedRole === "account staff" ||
    normalizedRole === "accounts staff" ||
    normalizedRole.includes("accountant") ||
    normalizedRole.includes("account staff") ||
    normalizedRole.includes("accounts staff");

  const canViewLatestEntry =
    isAdmin ||
    (isAccountantRole
      ? latestEntryPermission.accountantAccess
      : latestEntryPermission.staffAccess);

  const displayRoleTitle = isAdmin ? "Admin User" : `${currentUser.username} User`;

  const filteredServices = serviceDirectory.filter(
    (s) =>
      (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.note && s.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="relative min-h-full overflow-x-hidden bg-transparent p-2 sm:p-3 lg:p-4 xl:p-5">
      <div className="smart-akshaya-tool-layer contents">
        {showCashCounterModal && <CashCounterTool onClose={() => setShowCashCounterModal(false)} />}
        {showSslcModal && <SSLCCalculatorTool onClose={() => setShowSslcModal(false)} />}
        {showCropResizeModal && <CropResizeTool onClose={() => setShowCropResizeModal(false)} />}
        {showPassportToolModal && <PassportSize onClose={() => setShowPassportToolModal(false)} />}
        {showPscModal && <PSCPhotoTool onClose={() => setShowPscModal(false)} />}
        {showPdfToolkitModal && <PDFToolkitTool onClose={() => setShowPdfToolkitModal(false)} />}
        {showConverterModal && <LandAreaConverterTool onClose={() => setShowConverterModal(false)} />}
        {showImageToTextModal && <ImageToTextTool onClose={() => setShowImageToTextModal(false)} />}
        {showCalculatorModal && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[5px] sm:p-6"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setShowCalculatorModal(false);
            }}
          >
            <CalculatorTool onClose={() => setShowCalculatorModal(false)} />
          </div>
        )}
        {showResumeBuilderModal && (
  <div
    className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[6px] sm:p-5"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setShowResumeBuilderModal(false);
      }
    }}
  >
    <div className="relative h-[94vh] w-full max-w-[1450px] overflow-hidden rounded-3xl bg-slate-100 shadow-2xl dark:bg-slate-950">
      <button
        type="button"
        aria-label="Close Resume Builder"
        onClick={() => setShowResumeBuilderModal(false)}
        className="absolute right-4 top-4 z-[100] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-xl font-bold text-slate-600 shadow-lg"
      >
        ×
      </button>

      <div className="h-full overflow-y-auto">
        <ResumeBuilder />
      </div>
    </div>
  </div>
)}
      </div>

      {showAttendancePopup && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Good Day 👋</h2>
            <p className="text-slate-500 mb-6">Please mark your attendance to continue.</p>
            <div className="space-y-4">
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Staff</p>
                <p className="text-xl font-bold text-slate-800">{currentUser.username}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Today</p>
                <p className="font-semibold">{todayDate}</p>
              </div>
              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase">Current Time</p>
                <p className="text-2xl font-bold text-blue-600">{currentTime}</p>
              </div>
            </div>

            {pendingCreditBills.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
                <button
                  type="button"
                  onClick={() => setShowAllPendingCredits((open) => !open)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-red-500">
                      Pending Credits
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {pendingCreditBills.length} customer{pendingCreditBills.length === 1 ? "" : "s"} • ₹
                      {pendingCreditBills
                        .reduce((sum, bill) => sum + Number(bill?.owedAmount || 0), 0)
                        .toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                      pending
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
                    {showAllPendingCredits ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                  </span>
                </button>

                {showAllPendingCredits && (
                  <div className="mt-3 max-h-[32vh] space-y-2 overflow-y-auto border-t border-red-200/70 pt-3">
                    {pendingCreditBills.map((bill) => (
                      <div
                        key={String(bill?.id || bill?.billNumber || bill?.mobileNumber)}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-800">
                            {bill?.customerName || "Customer"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {bill?.mobileNumber || bill?.customerPhone || ""}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-red-600">
                          ₹{Number(bill?.owedAmount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pendingCreditBills.length === 0 && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">
                  Pending Credits
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-700">
                  No pending customer credit.
                </p>
              </div>
            )}

            {attendanceSaved ? (
              <div className="mt-8 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
                  <span className="text-5xl text-green-600">✓</span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-green-600">Attendance Marked Successfully</h3>
              </div>
            ) : (
              <button
                onClick={() => {
                  try {
                    const logs = JSON.parse(localStorage.getItem("staff_attendance_logs") || "[]");
                    logs.push({
                      id: Date.now().toString(),
                      staffName: currentUser.username,
                      role: currentUser.role,
                      timestamp: new Date().toISOString(),
                      loginTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    });
                    localStorage.setItem("staff_attendance_logs", JSON.stringify(logs));
                    setAttendanceSaved(true);
                    setTimeout(() => {
                      setShowAttendancePopup(false);
                      setAttendanceSaved(false);
                    }, 2000);
                  } catch (err) {}
                }}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold"
              >
                Mark Attendance
              </button>
            )}
          </div>
        </div>
      )}

      {showUpdateBubble && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white rounded-2xl shadow-xl p-4 w-72">
          <h3 className="font-bold text-lg">🚀 New Version Available</h3>
          <p className="text-sm mt-2">Click below to update your application.</p>
          <button
            onClick={() => {
              localStorage.setItem("smart_akshaya_app_version", currentVersion);
              setShowUpdateBubble(false);
              window.location.reload();
            }}
            className="mt-4 w-full bg-white text-blue-600 font-bold py-2 rounded-xl"
          >
            Update Now
          </button>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-2.5 pb-5">
        <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-4 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl mb-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Dashboard</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative rounded-2xl border border-slate-200/80 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={19} />
                {announcements.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                    <p className="text-xs text-slate-500">{announcements.length} unread message(s)</p>
                  </div>
                  {announcements.length > 0 && (
                    <button
                      onClick={handleClearAllNotifications}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-md transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {announcements.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">No new notifications.</div>
                  ) : (
                    announcements.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-slate-50/80 transition flex items-start gap-3 relative">
                        <span className="absolute top-4 left-3 w-2 h-2 bg-emerald-500 rounded-full mt-1"></span>
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 ml-2">
                          <Megaphone size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <p className="text-sm font-bold text-slate-800 truncate">{item.title}</p>
                            <span className="text-[10px] text-slate-400 shrink-0">{item.date}</span>
                          </div>
                          {item.subtitle && <p className="text-xs font-semibold text-slate-600 mt-0.5">{item.subtitle}</p>}
                          <p className="text-xs text-slate-500 mt-1">{item.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>

            {canViewLatestEntry && (
            <div className="relative" ref={latestEntryRef}>
              <button
                ref={latestEntryButtonRef}
                onClick={handleLatestEntryToggle}
                className="relative rounded-2xl border border-slate-200/80 bg-white/70 p-2 text-slate-700 shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                aria-label="Latest billed entry"
                title="Latest billed entry"
              >
                <History size={19} />
              </button>

            </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-4 text-white shadow-[0_20px_55px_rgba(37,99,235,0.20)] sm:px-6 sm:py-5">
          <div className="relative z-10 pr-2 sm:pr-52">
            <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200">{todayDate}</p>
            <h3 className="text-xl font-black tracking-tight sm:text-2xl">Welcome back, {currentUser.username}!</h3>
          </div>
          <div className="absolute bottom-3 right-4 hidden min-w-[150px] rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-right backdrop-blur-xl sm:block">
            <p className="text-[10px] opacity-80 uppercase font-semibold">Logged in as</p>
            <p className="text-xs font-bold">{displayRoleTitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Today's Entries</p>
              <p className="mt-0.5 text-lg font-bold leading-none">{todayEntriesCount}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <FileText size={19} />
            </div>
          </div>

          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Completed Today</p>
              <p className="mt-0.5 text-lg font-bold leading-none">{completedTodayCount}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Wallet size={22} />
            </div>
          </div>

          <div className="group flex h-[78px] items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]">
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">Total Cash Collection</p>
              <p className="mt-0.5 text-lg font-bold leading-none">₹{totalCashCollection.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-2 text-rose-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <DollarSign size={22} />
            </div>
          </div>

          <div
            onClick={() => setShowWalletDetails(!showWalletDetails)}
            className="group flex h-[78px] cursor-pointer items-center justify-between gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-[0_10px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-fuchsia-300/60 hover:shadow-[0_18px_45px_rgba(15,23,42,0.11)]"
          >
            <div>
              <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 flex items-center gap-1">
                Net Wallet Balance {showWalletDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </p>
              <p className={`mt-0.5 text-lg font-bold leading-none ${netWalletBalance < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{netWalletBalance.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-fuchsia-50 p-2 text-fuchsia-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Wallet size={22} />
            </div>
          </div>
        </div>

        {showWalletDetails && (
          <div className="rounded-3xl border border-white/80 bg-white/65 p-5 shadow-sm backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
            <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-fuchsia-600" /> Individual Wallet Balances
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {wallets.map((w) => (
                <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">{w.name}</span>
                  <span className={`text-lg font-black mt-2 ${w.currentBalance < 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    ₹{w.currentBalance.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h4 className="font-bold text-slate-800">Quick Launch Tools</h4>
              <p className="text-xs text-slate-400">
                {isCustomizing ? "Drag and drop cards using your mouse to rearrange" : "Frequently used utilities"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isCustomizing ? (
                <button
                  onClick={() => setIsCustomizing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  <Settings size={14} />
                  Customize Layout
                </button>
              ) : (
                <button
                  onClick={handleSaveLayout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md transition"
                >
                  <Save size={14} />
                  Save Layout
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {quickLinks.map((tool, index) => {
              const isCashCounter = tool.name.toLowerCase().includes("cash") || (tool.url && tool.url.toLowerCase().includes("cash"));
              const isSslc = tool.name.toLowerCase().includes("sslc") || (tool.url && tool.url.toLowerCase().includes("sslc"));
              const isCropResize = tool.name.toLowerCase().includes("crop") || (tool.url && tool.url.toLowerCase().includes("crop"));
              const isPsc = tool.name.toLowerCase().includes("psc") || (tool.url && tool.url.toLowerCase().includes("psc"));
              const isPassport = tool.name.toLowerCase().includes("passport") || (tool.url && tool.url.toLowerCase().includes("passport"));
              const isPdfTool = tool.name.toLowerCase().includes("pdf") || tool.url === "pdf-toolkit-modal";
              const isConverterTool = tool.name.toLowerCase().includes("converter") || tool.url === "converter-modal";
              const isImageToTextTool = tool.name.toLowerCase().includes("image") || tool.url === "image-to-text-modal";
              const isCalculatorTool = tool.name.toLowerCase().includes("calculator") || tool.url === "calculator-modal";
              const isResumeBuilderTool = tool.url === "resume-builder-modal";
              const isStatusCenter = tool.url === "status-center";
              return (
                <div
                  key={`${tool.id}-${index}`}
                  draggable={isCustomizing}
                  onDragStart={() => (draggedItemIndex.current = index)}
                  onDragEnter={() => (draggedOverItemIndex.current = index)}
                  onDragEnd={handleDragSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={`relative flex flex-col transition-transform ${isCustomizing ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <a
                    href={
                      isCustomizing ||
                      isCashCounter ||
                      isSslc ||
                      isCropResize ||
                      isPsc ||
                      isPassport ||
                      isPdfTool ||
                      isConverterTool ||
                      isImageToTextTool ||
                      isCalculatorTool ||
                      isResumeBuilderTool
                        ? undefined
                        : tool.url
                    }
                    onClick={(e) => {
                      if (isCustomizing) {
                        e.preventDefault();
                        return;
                      }
                      if (isCashCounter) {
                        e.preventDefault();
                        setShowCashCounterModal(true);
                      } else if (isSslc) {
                        e.preventDefault();
                        setShowSslcModal(true);
                      } else if (isCropResize) {
                        e.preventDefault();
                        setShowCropResizeModal(true);
                      } else if (isPsc) {
                        e.preventDefault();
                        setShowPscModal(true);
                      } else if (isPassport) {
                        e.preventDefault();
                        setShowPassportToolModal(true);
                      } else if (isPdfTool) {
                        e.preventDefault();
                        setShowPdfToolkitModal(true);
                      } else if (isConverterTool) {
                        e.preventDefault();
                        setShowConverterModal(true);
                      } else if (isImageToTextTool) {
                        e.preventDefault();
                        setShowImageToTextModal(true);
                      } else if (isCalculatorTool) {
                        e.preventDefault();
                        setShowCalculatorModal(true);
                      } else if (isResumeBuilderTool) {
                        e.preventDefault();
                        setShowResumeBuilderModal(true);
                      } else if (isStatusCenter) {
                        e.preventDefault();
                        setStatusCenterView("center");
                      }
                    }}
                    target={tool.isInternal ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    className={`flex h-24 flex-col justify-between p-3 bg-gradient-to-br ${
                      tool.bgColor || "from-indigo-500 to-violet-600"
                    } text-white rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.14)] hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 ${
                      isCustomizing ? "ring-2 ring-blue-400 ring-offset-2 opacity-95" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <FileText size={19} />
                      {isCustomizing ? (
                        <GripHorizontal size={20} className="text-white/80" />
                      ) : (
                        !tool.isInternal && <ExternalLink size={16} className="opacity-75" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold block truncate">{tool.name}</span>
      <span className="text-xs opacity-80">
  {(
    tool.isInternal ||
    isCashCounter ||
    isSslc ||
    isCropResize ||
    isPsc ||
    isPassport ||
    isPdfTool ||
    isConverterTool ||
    isImageToTextTool ||
    isCalculatorTool ||
    isResumeBuilderTool
  )
    ? "Internal Tool"
    : "External Link"}
</span>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {statusCenterView && (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[5px] sm:p-5"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setStatusCenterView(null);
            }}
          >
            <div className="relative flex h-auto max-h-[80vh] w-[min(92vw,950px)] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
              <div className="shrink-0 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-4 py-3 text-white sm:px-5">
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                      {statusCenterView === "center" ? (
                        <ClipboardCheck size={19} />
                      ) : statusCenterView === "edistrict" ? (
                        <ClipboardCheck size={19} />
                      ) : (
                        <ScrollText size={19} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black tracking-tight sm:text-lg">
                        {statusCenterView === "center"
                          ? "Status Center"
                          : statusCenterView === "edistrict"
                          ? "e-District Status"
                          : "Gazette Notification"}
                      </h3>
                      <p className="truncate text-[10px] text-blue-200 sm:text-xs">
                        {statusCenterView === "center"
                          ? "Government application status & certificate services"
                          : "Live government status service"}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {statusCenterView !== "center" && (
                      <button
                        type="button"
                        onClick={() => setStatusCenterView("center")}
                        className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[11px] font-bold text-white ring-1 ring-white/10 transition hover:bg-white/20"
                      >
                        <ArrowLeft size={13} />
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStatusCenterView(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white transition hover:bg-white/20"
                      aria-label="Close"
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {statusCenterView === "center" ? (
                  <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                    <div className="mb-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
                        Available Services
                      </p>
                      <h4 className="mt-0.5 text-sm font-black text-slate-800">
                        Check application status
                      </h4>
                    </div>

                    {/* Small dashboard-style tiles: ready for many more status services. */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      <button
                        type="button"
                        onClick={() => setStatusCenterView("edistrict")}
                        className="group min-h-[104px] rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                            <ClipboardCheck size={16} />
                          </div>
                          <ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-blue-600" />
                        </div>
                        <h5 className="mt-2.5 text-[11px] font-black text-slate-800">e-District</h5>
                        <p className="mt-0.5 text-[9px] leading-3.5 text-slate-500">
                          Certificate application status
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusCenterView("gazette")}
                        className="group min-h-[104px] rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-3.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                            <ScrollText size={16} />
                          </div>
                          <ArrowUpRight size={15} className="text-slate-300 transition group-hover:text-violet-600" />
                        </div>
                        <h5 className="mt-2.5 text-[11px] font-black text-slate-800">Kerala Gazette</h5>
                        <p className="mt-0.5 text-[9px] leading-3.5 text-slate-500">
                          Gazette application status
                        </p>
                      </button>

                      {/* Future status-service tiles can be added here using the same compact style. */}
                    </div>
                  </div>
                ) : (
                  <div className="status-tool-host">
                    {statusCenterView === "edistrict" ? (
                      <StatusEdistrictTool />
                    ) : (
                      <StatusGazetteTool />
                    )}
                  </div>
                )}
              </div>
            </div>

            <style jsx global>{`
              /* Keep embedded status tools compact inside the Dashboard popup. */
              .status-tool-host {
                min-height: 0;
                width: 100%;
                background: #ffffff;
              }

              /* Embedded status pages must size to their CONTENT, not to 100vh.
                 The standalone Gazette page intentionally uses min-height: 100vh;
                 this override applies only inside the Dashboard popup. */
              .status-tool-host .gazette-page {
                min-height: 0 !important;
                height: auto !important;
                padding: 24px 20px 28px !important;
                background: #f7f9fd !important;
              }

              .status-tool-host .edistrict-page {
                min-height: 0 !important;
                height: auto !important;
                padding: 22px !important;
              }

              .status-tool-host .gazette-container,
              .status-tool-host .edistrict-shell {
                max-width: none !important;
                width: 100% !important;
              }

              .status-tool-host .gazette-header {
                margin-bottom: 14px !important;
              }

              .status-tool-host .gazette-footer {
                margin-top: 16px !important;
              }
            `}</style>
          </div>
        )}

        <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <div 
            onClick={() => setShowServiceDirectory(!showServiceDirectory)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Service Directory
              </span>
              <h4 className="text-base font-bold text-slate-800">Quickly Access Any Service</h4>
            </div>
            <button className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 transition">
              {showServiceDirectory ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {showServiceDirectory && (
            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-2">
              <div className="relative w-full max-w-lg mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search for a service..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {filteredServices.length === 0 ? (
                  <div className="col-span-full py-8 text-slate-400 text-sm">No services with URLs found matching your search.</div>
                ) : (
                  filteredServices.map((service, index) => (
                    <a
                      key={index}
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600 transition">{service.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{service.note}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-slate-400 shrink-0 group-hover:text-blue-600 transition" />
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      {canViewLatestEntry && isLatestEntryOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            data-latest-entry-popup
            className="fixed z-[999999] w-[min(26rem,calc(100vw-1.5rem))] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-slate-100 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2"
            style={{
              top: latestEntryPopupPosition.top,
              left: latestEntryPopupPosition.left,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Latest Billed Entry</h4>
                  <p className="mt-0.5 text-xs text-slate-500">Latest bill from all staff</p>
                </div>
                <History size={18} className="shrink-0 text-blue-600" />
              </div>

              <select
                value={latestEntryStaff}
                onChange={(e) => void handleLatestEntryStaffChange(e.target.value)}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">All Staff — Latest Entry</option>
                {latestEntryStaffList.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff}
                  </option>
                ))}
              </select>
            </div>

            {latestEntryLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Loading latest entry...
              </div>
            ) : latestEntry ? (
              <div className="p-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Staff</p>
                      <p className="truncate text-sm font-bold text-slate-800">{latestEntry.staffName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</p>
                      <p className="text-lg font-black text-blue-700">₹{latestEntry.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service</p>
                      <p className="text-sm font-semibold text-slate-700">{latestEntry.serviceName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                        <p className="truncate text-xs font-semibold text-slate-700">{latestEntry.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile</p>
                        <p className="truncate text-xs font-semibold text-slate-700">{latestEntry.phone}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                        <p className="text-[10px] text-slate-400">Paid</p>
                        <p className="text-sm font-bold text-emerald-600">₹{latestEntry.totalPaid.toFixed(2)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                        <p className="text-[10px] text-slate-400">Balance</p>
                        <p className={`text-sm font-bold ${latestEntry.balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          ₹{latestEntry.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 text-[10px] text-slate-400">{latestEntry.dateTime}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">No billed entries found.</div>
            )}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}