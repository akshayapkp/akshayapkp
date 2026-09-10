import { NextResponse } from 'next/server';

const STATUS_URL =
  'https://tathya.uidai.gov.in/statusCheckService/api/generic/aadhaar-request-status';

export async function POST(req: Request) {
  try {
    const raw = await req.text();

    if (!raw.trim()) {
      return NextResponse.json(
        { error: 'Empty status request. Please enter EID/SID and CAPTCHA.' },
        { status: 400 },
      );
    }

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Invalid status request payload.' },
        { status: 400 },
      );
    }

    const eid = String(body?.eid ?? '').trim();
    const captchaValue = String(body?.captchaValue ?? '').trim();
    const captchaTxnId = String(body?.captchaTxnId ?? '').trim();

    if (!eid) {
      return NextResponse.json({ error: 'Enter EID / SID.' }, { status: 400 });
    }
    if (!captchaValue) {
      return NextResponse.json({ error: 'Enter CAPTCHA.' }, { status: 400 });
    }
    if (!captchaTxnId) {
      return NextResponse.json(
        { error: 'Refresh CAPTCHA and try again.' },
        { status: 400 },
      );
    }

    const response = await fetch(STATUS_URL, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en_in',
        Referer: 'https://myaadhaar.uidai.gov.in/',
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
        appId: 'MYAADHAAR',
        'X-Request-TimeStamp': String(Date.now()),
        Origin: 'https://myaadhaar.uidai.gov.in',
      },
      body: JSON.stringify({
        eid,
        captchaValue,
        captchaTxnId,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    const text = await response.text();

    if (!text.trim()) {
      return NextResponse.json(
        { error: `UIDAI returned an empty status response (HTTP ${response.status}).` },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'UIDAI returned an invalid status response.' },
        { status: 502 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `UIDAI status service returned HTTP ${response.status}.`,
          uidaiResponse: data,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Aadhaar status request failed:', error);

    return NextResponse.json(
      {
        error:
          'Unable to connect to UIDAI status service from this server.',
      },
      { status: 502 },
    );
  }
}
