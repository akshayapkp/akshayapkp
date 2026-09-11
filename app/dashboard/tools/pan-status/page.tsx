"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { RefreshCw, Search, ShieldCheck, X } from "lucide-react";

 type SearchType = "pan" | "coupon";

type PanResult = {
  searchType: SearchType;
  searchValue: string;
  couponNumber?: string;
  applicationType?: string;
  applicantName?: string;
  status?: string;
  region?: string;
  found?: boolean;
};

export default function PanStatusPage() {
  const [searchType, setSearchType] = useState<SearchType>("pan");
  const [searchValue, setSearchValue] = useState("");
  const [dob, setDob] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaUrl, setCaptchaUrl] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [result, setResult] = useState<PanResult | null>(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadCaptcha = async () => {
    setLoadingCaptcha(true);
    setError("");
    setCaptcha("");

    try {
      const response = await fetch(`/api/pan-status/captcha?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load UTIITSL CAPTCHA.");
      }
      setCaptchaUrl(data.captchaDataUrl || "");
      setSessionId(data.sessionId || "");
    } catch (err) {
      setCaptchaUrl("");
      setSessionId("");
      setError(err instanceof Error ? err.message : "Unable to load UTIITSL CAPTCHA.");
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []);

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setSearchValue("");
    setResult(null);
    setError("");
  };

  const clear = () => {
    setSearchValue("");
    setDob("");
    setCaptcha("");
    setResult(null);
    setError("");
    void loadCaptcha();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!sessionId || !captchaUrl) {
      setError("CAPTCHA is not ready. Please refresh the CAPTCHA.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/pan-status/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchType,
          searchValue: searchValue.trim(),
          dob: dob.trim(),
          captcha: captcha.trim(),
          sessionId,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to fetch PAN status.");
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch PAN status.");
      // UTIITSL CAPTCHA is single-use/session-bound. A failed search should get a fresh one.
      void loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="pan-page">
      <div className="pan-shell">
        <div className="pan-heading">
          <div className="pan-heading-icon"><ShieldCheck size={19} /></div>
          <div>
            <h1>PAN Card Status</h1>
            <p>Live application tracking through UTIITSL</p>
          </div>
        </div>

        <section className="pan-card">
          <div className="pan-tabs" role="tablist" aria-label="PAN search type">
            <button
              type="button"
              className={searchType === "pan" ? "active" : ""}
              onClick={() => handleSearchTypeChange("pan")}
            >
              PAN Number
            </button>
            <button
              type="button"
              className={searchType === "coupon" ? "active" : ""}
              onClick={() => handleSearchTypeChange("coupon")}
            >
              Coupon Number
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="pan-grid top-grid">
              <label>
                <span>{searchType === "pan" ? "PAN NUMBER" : "APPLICATION COUPON NUMBER"}</span>
                <input
                  value={searchValue}
                  onChange={(e) => setSearchValue(searchType === "pan" ? e.target.value.toUpperCase() : e.target.value)}
                  placeholder={searchType === "pan" ? "ABCDE1234F" : "R018477846"}
                  autoComplete="off"
                  maxLength={searchType === "pan" ? 10 : 30}
                />
              </label>
              <label>
                <span>DATE OF BIRTH</span>
                <input
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="pan-grid captcha-grid">
              <div>
                <span className="field-title">CAPTCHA</span>
                <div className="captcha-box">
                  {captchaUrl ? (
                    <img src={captchaUrl} alt="UTIITSL CAPTCHA" />
                  ) : (
                    <span>{loadingCaptcha ? "Loading CAPTCHA…" : "CAPTCHA unavailable"}</span>
                  )}
                </div>
              </div>

              <div className="captcha-entry-wrap">
                <span className="field-title">ENTER CAPTCHA</span>
                <div className="captcha-entry">
                  <button type="button" onClick={loadCaptcha} disabled={loadingCaptcha} aria-label="Refresh CAPTCHA" title="Refresh CAPTCHA">
                    <RefreshCw size={18} className={loadingCaptcha ? "spin" : ""} />
                  </button>
                  <input
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    placeholder="Enter code"
                    autoComplete="off"
                    maxLength={12}
                  />
                </div>
              </div>
            </div>

            <div className="pan-actions">
              <button className="check-btn" type="submit" disabled={loading || loadingCaptcha}>
                <Search size={15} />
                {loading ? "Checking…" : "Check Status"}
              </button>
              <button className="clear-btn" type="button" onClick={clear} disabled={loading}>
                <X size={15} /> Clear
              </button>
            </div>
          </form>

          <p className="source-note">Live source: UTIITSL PAN Online • CAPTCHA + session are generated dynamically.</p>

          {error && <div className="pan-error">{error}</div>}
        </section>

        {result && (
          <section className="pan-result">
            <div className="result-head">
              <div>
                <p className="result-kicker">PAN APPLICATION STATUS</p>
                <h2>{result.applicantName || "Applicant"}</h2>
              </div>
              <span className="result-badge">LIVE</span>
            </div>

            <div className="status-box">{result.status || "Status available"}</div>

            <div className="result-grid">
              <div><span>Search By</span><strong>{result.searchType === "pan" ? "PAN Number" : "Coupon Number"}</strong></div>
              <div><span>Search Value</span><strong>{result.searchValue}</strong></div>
              <div><span>Coupon Number</span><strong>{result.couponNumber || "—"}</strong></div>
              <div><span>Application Type</span><strong>{result.applicationType || "—"}</strong></div>
              <div><span>Applicant Name</span><strong>{result.applicantName || "—"}</strong></div>
              <div><span>Region</span><strong>{result.region || "—"}</strong></div>
            </div>
          </section>
        )}

        <footer>UTIITSL PAN application status service</footer>
      </div>

      <style jsx>{`
        .pan-page{min-height:100%;padding:24px;background:#f4f7fc;color:#18243d;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .pan-shell{width:100%;max-width:1000px;margin:0 auto}
        .pan-heading{display:flex;align-items:center;gap:11px;margin-bottom:15px}
        .pan-heading-icon{width:32px;height:32px;border-radius:9px;background:#2563eb;color:#fff;display:grid;place-items:center;box-shadow:0 6px 18px rgba(37,99,235,.22)}
        h1{margin:0;font-size:19px;font-weight:850;letter-spacing:-.02em}
        .pan-heading p{margin:3px 0 0;font-size:10px;color:#6d7f9a}
        .pan-card,.pan-result{background:#fff;border:1px solid #d9e3f0;border-radius:15px;box-shadow:0 8px 26px rgba(15,23,42,.06);padding:14px}
        .pan-tabs{display:flex;gap:7px;margin-bottom:13px}
        .pan-tabs button{height:31px;padding:0 13px;border-radius:8px;border:1px solid #d7e0ee;background:#f8fafc;color:#334155;font-size:10px;font-weight:800;cursor:pointer}
        .pan-tabs button.active{background:#eff6ff;border-color:#7eb1ff;color:#2563eb}
        .pan-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        label,.captcha-entry-wrap>span,.field-title{display:block;font-size:9px;font-weight:800;color:#43526a;letter-spacing:.04em}
        label span,.field-title{margin-bottom:6px}
        input{width:100%;height:35px;box-sizing:border-box;border:1px solid #ccd8e8;border-radius:8px;padding:0 10px;background:#fff;color:#16223a;outline:none;font-size:11px}
        input:focus{border-color:#4f8df7;box-shadow:0 0 0 3px rgba(79,141,247,.1)}
        input::placeholder{color:#9aa8bb}
        .captcha-grid{margin-top:10px;align-items:end}
        .captcha-box{height:35px;border:1px solid #ccd8e8;border-radius:8px;background:#f8fafc;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .captcha-box img{display:block;max-width:100%;height:34px;object-fit:contain}
        .captcha-box span{font-size:9px;color:#8a9ab1}
        .captcha-entry{display:grid;grid-template-columns:35px 1fr;gap:7px}
        .captcha-entry button{height:35px;border:1px solid #ccd8e8;background:#fff;border-radius:8px;color:#2563eb;display:grid;place-items:center;cursor:pointer}
        .captcha-entry button:disabled{opacity:.6;cursor:wait}
        .spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .pan-actions{display:flex;gap:7px;margin-top:10px}
        .pan-actions button{height:32px;border:0;border-radius:8px;padding:0 13px;display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:800;cursor:pointer}
        .check-btn{background:#2563eb;color:#fff}.check-btn:disabled{opacity:.65;cursor:wait}
        .clear-btn{background:#e8eef6;color:#334155}.clear-btn:disabled{opacity:.65}
        .source-note{margin:9px 0 0;color:#8a9ab1;font-size:8px}
        .pan-error{margin-top:9px;border:1px solid #fecaca;background:#fff1f2;color:#c02626;border-radius:8px;padding:8px 10px;font-size:9px}
        .pan-result{margin-top:12px;padding:0;overflow:hidden}
        .result-head{padding:13px 14px;border-bottom:1px solid #e5eaf2;display:flex;justify-content:space-between;gap:12px;align-items:center}
        .result-kicker{margin:0 0 3px;color:#71819a;font-size:8px;font-weight:850;letter-spacing:.08em}
        .result-head h2{margin:0;font-size:17px;font-weight:850}
        .result-badge{font-size:8px;font-weight:850;color:#047857;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:999px;padding:4px 8px}
        .status-box{margin:12px 14px 0;padding:10px 11px;border-radius:9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-size:10px;font-weight:750;line-height:1.45}
        .result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#e5eaf2;margin-top:12px}
        .result-grid>div{background:#fff;padding:11px 14px;min-width:0}.result-grid span{display:block;font-size:8px;text-transform:uppercase;color:#7c8ba1;font-weight:800}.result-grid strong{display:block;margin-top:4px;font-size:10px;color:#17243c;overflow-wrap:anywhere}
        footer{text-align:center;color:#9aa8bb;font-size:8px;margin-top:10px}
        @media(max-width:700px){.pan-page{padding:14px}.pan-grid,.result-grid{grid-template-columns:1fr}.captcha-grid{align-items:stretch}}
      `}</style>
    </main>
  );
}
