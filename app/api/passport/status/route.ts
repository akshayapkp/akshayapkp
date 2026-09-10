import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PASSPORT_API =
  "https://api1.passportindia.gov.in/v1/online/trackStatusForFileNo";

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const fileNo = clean(body?.fileNo).toUpperCase();
    const applDob = clean(body?.applDob);

    if (!fileNo) {
      return NextResponse.json(
        { ok: false, error: "Please enter the Passport File Number." },
        { status: 400 }
      );
    }

    if (!applDob) {
      return NextResponse.json(
        { ok: false, error: "Please enter the Date of Birth." },
        { status: 400 }
      );
    }

    const payload = {
      requestResponseMap: {
        fileNo,
        applDob,
        optStatus: "Application_Status",
      },
    };

    const upstream = await fetch(PASSPORT_API, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:155.0) Gecko/20100101 Firefox/155.0",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://www.passportindia.gov.in",
        Referer: "https://www.passportindia.gov.in/",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const raw = await upstream.text();

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Passport Seva returned an unexpected response.",
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data?.message ||
            data?.error ||
            `Passport Seva request failed (${upstream.status}).`,
        },
        { status: upstream.status }
      );
    }

    const map = data?.requestResponseMap ?? {};
    const rows = Array.isArray(map?.applicationStatus)
      ? map.applicationStatus
      : [];

    if (!rows.length) {
      const message =
        clean(map?.statusMessage) ||
        clean(map?.msgArg?.[0]) ||
        "No application status was returned. Please check the File Number and Date of Birth.";

      return NextResponse.json(
        { ok: false, error: message },
        { status: 404 }
      );
    }

    const row = rows[0];

    return NextResponse.json({
      ok: true,
      result: {
        applicationReference: clean(row?.APP_REF_NO_FK || map?.msgKey),
        fileNumber: clean(row?.FILE_NO || map?.fileNo || fileNo),
        dateOfBirth: clean(row?.DATE_OF_BIRTH || map?.applDob || applDob),
        applicationDate: clean(row?.APP_SUB_DATE),
        lastModifiedDate: clean(row?.LAST_MODIFIED_DATEZ),
        applicantName: [clean(row?.APPL_GIVEN_NAME), clean(row?.APPL_SURNAME)]
          .filter(Boolean)
          .join(" "),
        applicationType: clean(row?.PARAM_VALUE),
        status: clean(row?.STATUS_MESSAGE || map?.statusMessage),
        statusMessage: clean(row?.STATUS_MESSAGE || map?.statusMessage),
        policeVerificationOffice: clean(map?.msgArg?.[0]),
        ivrCode: clean(row?.IVR_CODE || map?.IVR_CODE),
        smsCode: clean(row?.SMS_CODE || map?.SMS_CODE),
        serviceCode: row?.SERVICE_MASTER_FK ?? null,
        policeVerificationCode: row?.PV_VERIFICATION_FK ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to connect to Passport Seva. Please try again.",
      },
      { status: 502 }
    );
  }
}
