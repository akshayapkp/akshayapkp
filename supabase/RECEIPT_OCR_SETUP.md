# Receipt camera OCR: deployment checklist

The public homepage has a small camera action. On mobile, it requests a photo via the browser's rear-camera capture hint, runs the existing Tesseract.js OCR in the browser using English + Malayalam, then submits only extracted text to the server. The original photo is not stored by this feature. The public flow does not display extracted text.

Staff can open Dashboard → Image & PDF To Text → History to read, edit, copy, delete an item, or clear the history. History endpoints require the existing signed staff session cookie. The Supabase table has RLS enabled and no public policies; reads and mutations use the server-only service-role key.

## Required setup before testing

1. In the Supabase project configured by `NEXT_PUBLIC_SUPABASE_URL`, open SQL Editor and run `supabase/receipt_ocr_history.sql`.
2. In Vercel project `akshayapkp`, confirm the existing server-only `SUPABASE_SERVICE_ROLE_KEY` is set for the deployment environment. Do not expose it using a `NEXT_PUBLIC_` variable.
3. Confirm `RESUME_SESSION_SECRET` is configured (at least 32 characters); it is used by the existing signed staff session.
4. Deploy the change, then test on a real iPhone and Android phone over HTTPS. Grant camera permission and capture a non-sensitive sample receipt.
5. Sign in as staff, open Dashboard → Image & PDF To Text → History, verify the text is present, edit it, save, copy, delete one item, and test Clear History.

## Limits and security notes

- The camera picker uses `accept="image/*"` and `capture="environment"`. Browser/OS behavior varies; some devices may show the system photo picker instead of opening the camera directly.
- OCR runs on the phone, so performance depends on the device and image quality. Only extracted text (up to 60,000 characters) is submitted; image files are not uploaded/stored.
- The public submit route has a best-effort per-instance throttle, but serverless instances do not share that memory. Before broadly promoting the public camera feature, configure an edge/WAF rate limit (or a shared rate-limit service) for `POST /api/receipt-ocr` and monitor abuse.
- Receipts can contain personal data. Test with dummy/non-sensitive receipts first and define an appropriate retention policy. The staff History list currently keeps the newest 200 items in its UI; the database does not automatically purge older items.
- The app's current staff login and session implementation is reused. History is available to signed-in staff; this first version does not restrict each item to the person who captured it.
- A production build and live Supabase round-trip still need to pass after the SQL and Vercel environment are configured.
