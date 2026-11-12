# Phase 2–6 Operations Guide

## Phase 2 — normalized database

Run these migrations in Supabase SQL Editor, in order:

1. `20260925_phase2_6_foundation.sql`
2. `20260925_phase2_6_idempotency.sql`

They create normalized tables for customers, services, bills, bill items, service entries, expenses, wallet transactions, customer applications, attendance, audit logs and migration snapshots.

The existing `feature_permissions` JSON store is preserved during the transition.

## Phase 2 — legacy data migration

The app contains a protected endpoint:

`POST /api/admin/migrate-legacy`

Required server environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or the newer `SUPABASE_SECRET_KEY`)
- `ADMIN_MIGRATION_KEY`

Send the migration key as the `x-migration-key` request header. The endpoint snapshots the legacy JSON first, then copies available arrays into normalized tables. Re-running is idempotent for records with stable legacy IDs.

Do not put the service-role/secret key in browser-exposed `NEXT_PUBLIC_*` variables.

## Phase 3 — security

The new normalized tables are RLS-enabled and deny browser `anon`/legacy `authenticated` access until the app's real authentication is cut over. This is deliberate: the current login stores its session in localStorage, so it is not yet a database security boundary.

Next security cutover:

1. Move staff login to Supabase Auth.
2. Store the authenticated user ID on staff/profile rows.
3. Add role-aware RLS policies for admin, accountant, staff and online staff.
4. Replace direct browser writes with authenticated queries or server-side actions.
5. Remove the hard-coded admin credential path.

## Phase 4 — backup and recovery

- Keep `legacy_migration_snapshots` until the migration is verified.
- Keep `data_audit_log` for operational history.
- Configure Supabase database backups/PITR according to the project's plan.
- Keep Storage media backups separately because database backups do not restore Storage objects.

## Phase 5 — localStorage cleanup

`lib/safe-local-storage.ts` provides namespaced, JSON-safe browser storage for UI preferences and offline caches.

Business records should move to the normalized database tables. During transition, keep the old keys read-only as a fallback; do not delete them until a successful migration and restore test has been completed.

## Phase 6 — reliability and UX

- Dashboard route loading skeleton added.
- Dashboard and global error boundaries added.
- Keep heavy route-specific features lazy-loaded where possible.
- Use explicit image dimensions/optimized Storage media.
- Standardize on one package manager and one lockfile before the next dependency upgrade.
- Keep customer documents in a private Storage bucket with authenticated access; do not use the public poster bucket for customer documents.

## Rollback

If migration validation fails, do not clear localStorage. Restore the database from the available backup/snapshot and keep the legacy `feature_permissions` data untouched. The normalized migration is additive until the final cutover.
