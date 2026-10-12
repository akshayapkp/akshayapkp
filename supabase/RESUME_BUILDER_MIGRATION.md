# Resume Builder Supabase migration

This migration creates the storage table for structured Resume Builder form data only.
PDFs are generated in the browser on demand and are not stored.

## Important current limitation

The existing dashboard login stores its session in browser localStorage. That is not a server-verifiable identity, so it must not be trusted by an API that uses the Supabase service-role key. The table intentionally has Row Level Security enabled and no public policies. Do not add anon/public SELECT, INSERT, UPDATE, or DELETE policies for this table.

Before enabling live writes, the app needs a server-verified session for the current staff/admin user, then a server route that scopes every query to that verified user/role and uses a server-only service key. The service key must never use a NEXT_PUBLIC_ variable or be shipped to the browser.

Existing local data key: `resume-builder-resumes-v1`. Do not clear it. Existing records remain in each browser until a separate export/import migration is implemented. New saves should not be switched over until secure server access is ready and tested.
