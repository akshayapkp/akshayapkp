"use client";

import { FormEvent, useState } from "react";

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

export default function KeralaGazetteTrackerPage() {
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

  const trackApplication = async (event: FormEvent<HTMLFormElement>) => {
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
          status: String(result.status ?? "").trim(),
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
              {result.status}
            </div>

            {result.gazetteNumber &&
              result.gazetteYear &&
              /published|approved/i.test(result.status) && (
                <a
                  className="gazette-print-button"
                  href={`https://compose.kerala.gov.in/kgCitizenServicefiledownloadpdf?gztnotemp=${encodeURIComponent(result.gazetteNumber)}&gztyeartemp=${encodeURIComponent(result.gazetteYear)}&dstid=&tlkid=&department=&partid=14`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View / Print Gazette Notification
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
          max-width: 620px;
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
