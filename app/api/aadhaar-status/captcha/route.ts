import { NextResponse } from 'next/server';

const CAPTCHA_URL =
  'https://tathya.uidai.gov.in/audioCaptchaService/api/captcha/v3/generation';

export async function POST() {
  try {
    const response = await fetch(CAPTCHA_URL, {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en_IN',
        Referer: 'https://myaadhaar.uidai.gov.in/',
        'Content-Type': 'application/json',
        'x-request-id': crypto.randomUUID(),
        appid: 'MYAADHAAR',
        Origin: 'https://myaadhaar.uidai.gov.in',
      },
      body: JSON.stringify({
        captchaLength: '6',
        captchaType: '2',
        audioCaptchaRequired: true,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    const text = await response.text();

    if (!text.trim()) {
      return NextResponse.json(
        { error: `UIDAI returned an empty CAPTCHA response (HTTP ${response.status}).` },
        { status: 502 },
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'UIDAI returned an invalid CAPTCHA response.' },
        { status: 502 },
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `UIDAI CAPTCHA service returned HTTP ${response.status}.` },
        { status: 502 },
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Aadhaar CAPTCHA request failed:', error);

    return NextResponse.json(
      {
        error:
          'Unable to connect to UIDAI CAPTCHA service from this server.',
      },
      { status: 502 },
    );
  }
}
