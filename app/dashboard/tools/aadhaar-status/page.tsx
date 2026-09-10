'use client';

import { useCallback, useEffect, useState } from 'react';

type Captcha = {
  imageBase64?: string;
  audioBase64?: string;
  transactionId?: string | number;
};

type Stage = {
  stageOrder?: number;
  stageName?: string;
  state?: string;
  message?: string;
  subStages?: Array<{
    subStageName?: string;
    subStageStatus?: string;
    subStageMessage?: string;
  }>;
};

type StatusItem = {
  typeOfRequest?: string;
  resMessage?: string;
  uidCompletedOrRejectedDate?: string;
  stages?: Stage[];
};

function normalizeImage(value?: string) {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  return `data:image/png;base64,${value}`;
}

export default function AadhaarStatusPage() {
  const [eid, setEid] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [result, setResult] = useState<StatusItem | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setError('');
    setCaptcha(null);
    setCaptchaValue('');

    try {
      const response = await fetch('/api/aadhaar-status/captcha', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
          'Unable to load UIDAI CAPTCHA. Please try Refresh again.'
        );
      }

      if (!data?.imageBase64 || data?.transactionId === undefined) {
        throw new Error('UIDAI returned an incomplete CAPTCHA response.');
      }

      setCaptcha(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load CAPTCHA.');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha]);

  async function checkStatus() {
    setChecking(true);
    setError('');
    setResult(null);

    try {
      const cleanEid = eid.trim();
      const cleanCaptcha = captchaValue.trim();

      if (!cleanEid) throw new Error('Enter EID / SID.');
      if (!captcha?.transactionId) {
        throw new Error('Refresh CAPTCHA and try again.');
      }
      if (!cleanCaptcha) throw new Error('Enter CAPTCHA.');

      const response = await fetch('/api/aadhaar-status/status', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eid: cleanEid,
          captchaValue: cleanCaptcha,
          captchaTxnId: String(captcha.transactionId),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || 'Unable to check Aadhaar status.'
        );
      }

      const item =
        Array.isArray(data?.statusData) ? data.statusData[0] :
        Array.isArray(data?.data) ? data.data[0] :
        data?.statusData || data?.data || data;

      if (!item || typeof item !== 'object') {
        throw new Error('UIDAI returned no status for this EID / SID.');
      }

      setResult(item as StatusItem);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to check Aadhaar status.');
      // CAPTCHA is single-use/short-lived in many UIDAI flows.
      void loadCaptcha();
    } finally {
      setChecking(false);
    }
  }

  return (
    <main style={{ minHeight: '100%', padding: 24, background: '#f6f8fb' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
            Aadhaar Status
          </h1>
          <p style={{ margin: '6px 0 0', color: '#667085' }}>
            Check Aadhaar enrolment / update status from UIDAI.
          </p>
        </div>

        <section style={card}>
          <label style={label}>EID / SID</label>
          <input
            value={eid}
            onChange={(e) => setEid(e.target.value)}
            placeholder="Enter EID / SID"
            style={input}
            autoComplete="off"
            spellCheck={false}
          />

          <label style={{ ...label, marginTop: 15 }}>CAPTCHA</label>

          <div style={captchaRow}>
            <div style={captchaBox}>
              {captchaLoading ? (
                <span>Loading CAPTCHA…</span>
              ) : captcha?.imageBase64 ? (
                <img
                  src={normalizeImage(captcha.imageBase64)}
                  alt="UIDAI CAPTCHA"
                  style={{
                    height: 62,
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <span>CAPTCHA unavailable</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void loadCaptcha()}
              disabled={captchaLoading || checking}
              style={secondary}
            >
              ↻ Refresh
            </button>
          </div>

          <input
            value={captchaValue}
            onChange={(e) => setCaptchaValue(e.target.value)}
            placeholder="Enter CAPTCHA"
            style={input}
            autoComplete="off"
            spellCheck={false}
          />

          <button
            type="button"
            onClick={() => void checkStatus()}
            disabled={checking || captchaLoading || !captcha?.transactionId}
            style={primary}
          >
            {checking ? 'Checking…' : 'Check Status'}
          </button>

          {error && <div style={errorBox}>{error}</div>}
        </section>

        {result && (
          <section style={{ ...card, marginTop: 18 }}>
            <div style={grid}>
              <div>
                <div style={muted}>Request Type</div>
                <div style={big}>{result.typeOfRequest || '—'}</div>
              </div>
              <div>
                <div style={muted}>Completed / Rejected Date</div>
                <div style={big}>
                  {result.uidCompletedOrRejectedDate || '—'}
                </div>
              </div>
            </div>

            {result.resMessage && (
              <div style={success}>{result.resMessage}</div>
            )}

            {!!result.stages?.length && (
              <>
                <h2 style={{ margin: '22px 0 12px', fontSize: 18 }}>
                  Processing Stages
                </h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {result.stages.map((stage, i) => (
                    <div
                      key={`${stage.stageOrder ?? 'stage'}-${i}`}
                      style={stageCard}
                    >
                      <div style={stageHead}>
                        <strong>
                          {stage.stageName || `Stage ${i + 1}`}
                        </strong>
                        <span style={badge}>
                          {stage.state || '—'}
                        </span>
                      </div>

                      {stage.message && (
                        <div style={message}>{stage.message}</div>
                      )}

                      {!!stage.subStages?.length && (
                        <div style={subList}>
                          {stage.subStages.map((sub, j) => (
                            <div
                              key={`${sub.subStageName ?? 'sub'}-${j}`}
                              style={subRow}
                            >
                              <span>{sub.subStageName || 'Sub-stage'}</span>
                              <strong>
                                {sub.subStageStatus || '—'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e4e7ec',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 4px 18px rgba(16,24,40,.05)',
};
const label: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
  color: '#344054',
};
const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: '1px solid #d0d5dd',
  borderRadius: 9,
  fontSize: 14,
};
const captchaRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  marginBottom: 10,
};
const captchaBox: React.CSSProperties = {
  flex: 1,
  minHeight: 64,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  border: '1px solid #d0d5dd',
  borderRadius: 9,
  overflow: 'hidden',
  color: '#667085',
  fontSize: 13,
};
const secondary: React.CSSProperties = {
  border: '1px solid #d0d5dd',
  borderRadius: 9,
  padding: '0 14px',
  background: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};
const primary: React.CSSProperties = {
  marginTop: 14,
  width: '100%',
  border: 0,
  borderRadius: 9,
  padding: '12px 16px',
  background: '#101828',
  color: '#fff',
  fontWeight: 800,
  cursor: 'pointer',
};
const errorBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 9,
  background: '#fef3f2',
  color: '#b42318',
  border: '1px solid #fecdca',
  fontSize: 13,
  lineHeight: 1.5,
};
const success: React.CSSProperties = {
  marginTop: 16,
  padding: 13,
  borderRadius: 10,
  background: '#ecfdf3',
  color: '#067647',
  border: '1px solid #abefc6',
  lineHeight: 1.5,
};
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 18,
};
const muted: React.CSSProperties = { color: '#667085', fontSize: 13 };
const big: React.CSSProperties = {
  fontWeight: 800,
  fontSize: 18,
  marginTop: 3,
};
const stageCard: React.CSSProperties = {
  border: '1px solid #e4e7ec',
  borderRadius: 12,
  padding: 15,
};
const stageHead: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
};
const badge: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  padding: '4px 8px',
  borderRadius: 999,
  background: '#ecfdf3',
  color: '#067647',
};
const message: React.CSSProperties = {
  marginTop: 8,
  color: '#475467',
  lineHeight: 1.5,
};
const subList: React.CSSProperties = {
  marginTop: 10,
  display: 'grid',
  gap: 7,
};
const subRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  fontSize: 13,
};
