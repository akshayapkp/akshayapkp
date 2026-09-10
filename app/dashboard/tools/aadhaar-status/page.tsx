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

function imageSrc(value?: string) {
  if (!value) return '';
  return value.startsWith('data:') ? value : `data:image/png;base64,${value}`;
}

function asObject(value: any): any {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function firstStringByKeys(root: any, keys: string[], seen = new Set<any>()): string {
  if (root === null || root === undefined) return '';
  if (typeof root !== 'object') return '';
  if (seen.has(root)) return '';
  seen.add(root);

  const wanted = new Set(keys.map(k => k.toLowerCase()));

  if (Array.isArray(root)) {
    for (const item of root) {
      const found = firstStringByKeys(item, keys, seen);
      if (found) return found;
    }
    return '';
  }

  for (const [key, value] of Object.entries(root)) {
    if (wanted.has(key.toLowerCase()) &&
        (typeof value === 'string' || typeof value === 'number')) {
      const text = String(value).trim();
      if (text) return text;
    }
  }

  for (const value of Object.values(root)) {
    const found = firstStringByKeys(value, keys, seen);
    if (found) return found;
  }

  return '';
}

function findStages(root: any, seen = new Set<any>()): Stage[] {
  if (!root || typeof root !== 'object' || seen.has(root)) return [];
  seen.add(root);

  if (Array.isArray(root)) {
    return root.flatMap(item => findStages(item, seen));
  }

  const stageName = firstStringByKeys(root, [
    'stageName', 'stage', 'requestStage', 'stepName'
  ]);
  const state = firstStringByKeys(root, [
    'stageStatus', 'state', 'status', 'requestStatus'
  ]);
  const message = firstStringByKeys(root, [
    'stageMessage', 'message', 'description', 'remarks'
  ]);

  const rawSubs =
    root.subStages ?? root.subStage ?? root.substeps ?? root.subSteps ?? [];

  const subStages = Array.isArray(rawSubs)
    ? rawSubs.map((sub: any) => ({
        subStageName: firstStringByKeys(sub, [
          'subStageName', 'name', 'stageName', 'subStage'
        ]),
        subStageStatus: firstStringByKeys(sub, [
          'subStageStatus', 'status', 'state'
        ]),
        subStageMessage: firstStringByKeys(sub, [
          'subStageMessage', 'message', 'description'
        ])
      }))
    : [];

  const current =
    stageName || state || message
      ? [{
          stageOrder: Number.isFinite(Number(root.stageOrder))
            ? Number(root.stageOrder)
            : undefined,
          stageName,
          state,
          message,
          subStages
        }]
      : [];

  const nested = Object.values(root).flatMap(value => findStages(value, seen));
  return [...current, ...nested];
}

function findRawMessage(root: any): string {
  return firstStringByKeys(root, [
    'resMessage',
    'responseMessage',
    'message',
    'msg',
    'statusMessage',
    'resultMessage',
    'description',
    'remarks'
  ]);
}

function findResponseObject(data: any): any {
  let root = asObject(data) ?? data;

  const wrappers = [
    'statusData',
    'responseData',
    'response',
    'resultData',
    'result',
    'data',
    'status',
    'aadhaarStatus',
    'requestStatus'
  ];

  for (let i = 0; i < 8; i++) {
    let changed = false;

    if (Array.isArray(root) && root.length === 1 && root[0] && typeof root[0] === 'object') {
      root = root[0];
      changed = true;
    }

    if (root && typeof root === 'object' && !Array.isArray(root)) {
      for (const key of wrappers) {
        const value = root[key];
        if (value !== undefined && value !== null) {
          const next = asObject(value) ?? value;
          if (next !== root) {
            root = next;
            changed = true;
            break;
          }
        }
      }
    }

    if (!changed) break;
  }

  return root;
}

function extractStatus(data: any): StatusItem | null {
  const parsed = asObject(data) ?? data;
  const root = findResponseObject(parsed);

  if (!root || typeof root !== 'object') {
    const text = typeof data === 'string' ? data.trim() : '';
    return text ? { resMessage: text } : null;
  }

  const typeOfRequest = firstStringByKeys(root, [
    'typeOfRequest',
    'requestType',
    'serviceType',
    'type',
    'updateType',
    'transactionType'
  ]);

  const resMessage = findRawMessage(root);

  const uidCompletedOrRejectedDate = firstStringByKeys(root, [
    'uidCompletedOrRejectedDate',
    'completedDate',
    'completionDate',
    'completedOn',
    'completionOn',
    'updatedDate',
    'rejectedDate',
    'rejectionDate',
    'rejectedOn'
  ]);

  const stages = findStages(root);

  if (!typeOfRequest && !resMessage && !uidCompletedOrRejectedDate && !stages.length) {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    return raw ? { resMessage: `Official UIDAI response: ${raw.slice(0, 8000)}` } : null;
  }

  return {
    typeOfRequest,
    resMessage,
    uidCompletedOrRejectedDate,
    stages
  };
}

function bridgeRequest<T>(action: string, extra: Record<string, unknown> = {}) {
  return new Promise<T>((resolve, reject) => {
    const requestId = crypto.randomUUID();

    const timer = window.setTimeout(() => {
      window.removeEventListener('message', listener);
      reject(new Error('UIDAI bridge did not respond. Keep the Smart Akshaya UIDAI Bridge extension enabled and try again.'));
    }, 30000);

    function listener(event: MessageEvent) {
      if (event.source !== window) return;
      const message = event.data;

      if (
        !message ||
        message.source !== 'smart-akshaya-aadhaar-bridge' ||
        message.requestId !== requestId
      ) return;

      window.clearTimeout(timer);
      window.removeEventListener('message', listener);

      if (message.ok) resolve(message.data as T);
      else reject(new Error(message.error || 'UIDAI request failed.'));
    }

    window.addEventListener('message', listener);

    window.postMessage({
      source: 'smart-akshaya-aadhaar-page',
      requestId,
      action,
      ...extra
    }, '*');
  });
}

export default function AadhaarStatusPage() {
  const [eid, setEid] = useState('');
  const [captcha, setCaptcha] = useState<Captcha | null>(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StatusItem | null>(null);

  const loadCaptcha = useCallback(async () => {
    setLoadingCaptcha(true);
    setError('');
    setResult(null);
    setCaptcha(null);
    setCaptchaValue('');

    try {
      const data = await bridgeRequest<Captcha>('captcha');
      setCaptcha(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load UIDAI CAPTCHA.');
    } finally {
      setLoadingCaptcha(false);
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
      if (!eid.trim()) throw new Error('Enter EID / SID.');
      if (!captcha?.transactionId) throw new Error('Refresh CAPTCHA and try again.');
      if (!captchaValue.trim()) throw new Error('Enter CAPTCHA.');

      const data = await bridgeRequest<any>('status', {
        eid: eid.trim(),
        captchaValue: captchaValue.trim(),
        captchaTxnId: String(captcha.transactionId)
      });

      const item = extractStatus(data);
      if (!item) throw new Error('UIDAI returned no status.');
      setResult(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to check Aadhaar status.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main style={{ minHeight: '100%', padding: 24, background: '#f6f8fb' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Aadhaar Status</h1>
        <p style={{ margin: '6px 0 20px', color: '#667085' }}>
          Check Aadhaar enrolment / update status from UIDAI.
        </p>

        <section style={card}>
          <label style={label}>EID / SID</label>
          <input value={eid} onChange={e => setEid(e.target.value)}
            placeholder="Enter EID / SID" style={input} autoComplete="off" />

          <label style={{ ...label, marginTop: 15 }}>CAPTCHA</label>
          <div style={captchaRow}>
            <div style={captchaBox}>
              {loadingCaptcha ? 'Loading CAPTCHA…' :
                captcha?.imageBase64 ? (
                  <img src={imageSrc(captcha.imageBase64)} alt="UIDAI CAPTCHA"
                    style={{ height: 62, maxWidth: '100%', objectFit: 'contain' }} />
                ) : 'CAPTCHA unavailable'}
            </div>
            <button type="button" onClick={() => void loadCaptcha()}
              disabled={loadingCaptcha || checking} style={secondary}>↻ Refresh</button>
          </div>

          <input value={captchaValue} onChange={e => setCaptchaValue(e.target.value)}
            placeholder="Enter CAPTCHA" style={input} autoComplete="off" />

          <button type="button" onClick={() => void checkStatus()}
            disabled={checking || loadingCaptcha || !captcha?.transactionId} style={primary}>
            {checking ? 'Checking…' : 'Check Status'}
          </button>

          {error && <div style={errorBox}>{error}</div>}
        </section>

        {result && (
          <section style={{ ...card, marginTop: 18 }}>
            <div style={grid}>
              <div><div style={muted}>Request Type</div><div style={big}>{result.typeOfRequest || '—'}</div></div>
              <div><div style={muted}>Completed / Rejected Date</div><div style={big}>{result.uidCompletedOrRejectedDate || '—'}</div></div>
            </div>
            <div style={{ ...success, fontSize: 15, fontWeight: 700 }}>
              <div style={{ marginBottom: 5 }}>UIDAI Status</div>
              <div style={{ fontWeight: 600 }}>
                {result.resMessage || result.typeOfRequest || 'Status received from UIDAI.'}
              </div>
            </div>
            {!!result.stages?.length && (
              <>
                <h2 style={{ margin: '22px 0 12px', fontSize: 18 }}>Processing Stages</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                  {result.stages.map((s, i) => (
                    <div key={`${s.stageOrder ?? 'stage'}-${i}`} style={stage}>
                      <div style={stageHead}>
                        <strong>{s.stageName || `Stage ${i + 1}`}</strong>
                        <span style={badge}>{s.state || '—'}</span>
                      </div>
                      {s.message && <div style={message}>{s.message}</div>}
                      {!!s.subStages?.length && (
                        <div style={subList}>
                          {s.subStages.map((sub, j) => (
                            <div key={`${sub.subStageName ?? 'sub'}-${j}`} style={subRow}>
                              <span>{sub.subStageName || 'Sub-stage'}</span>
                              <strong>{sub.subStageStatus || '—'}</strong>
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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e4e7ec', borderRadius: 16, padding: 20, boxShadow: '0 4px 18px rgba(16,24,40,.05)' };
const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7, color: '#344054' };
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', border: '1px solid #d0d5dd', borderRadius: 9, fontSize: 14 };
const captchaRow: React.CSSProperties = { display: 'flex', gap: 10, marginBottom: 10 };
const captchaBox: React.CSSProperties = { flex: 1, minHeight: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #d0d5dd', borderRadius: 9, overflow: 'hidden', color: '#667085', fontSize: 13 };
const secondary: React.CSSProperties = { border: '1px solid #d0d5dd', borderRadius: 9, padding: '0 14px', background: '#fff', fontWeight: 700, cursor: 'pointer' };
const primary: React.CSSProperties = { marginTop: 14, width: '100%', border: 0, borderRadius: 9, padding: '12px 16px', background: '#101828', color: '#fff', fontWeight: 800, cursor: 'pointer' };
const errorBox: React.CSSProperties = { marginTop: 14, padding: 12, borderRadius: 9, background: '#fef3f2', color: '#b42318', border: '1px solid #fecdca', fontSize: 13, lineHeight: 1.5 };
const success: React.CSSProperties = { marginTop: 16, padding: 13, borderRadius: 10, background: '#ecfdf3', color: '#067647', border: '1px solid #abefc6', lineHeight: 1.5 };
const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18 };
const muted: React.CSSProperties = { color: '#667085', fontSize: 13 };
const big: React.CSSProperties = { fontWeight: 800, fontSize: 18, marginTop: 3 };
const stage: React.CSSProperties = { border: '1px solid #e4e7ec', borderRadius: 12, padding: 15 };
const stageHead: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 };
const badge: React.CSSProperties = { fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: '#ecfdf3', color: '#067647' };
const message: React.CSSProperties = { marginTop: 8, color: '#475467', lineHeight: 1.5 };
const subList: React.CSSProperties = { marginTop: 10, display: 'grid', gap: 7 };
const subRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 };
