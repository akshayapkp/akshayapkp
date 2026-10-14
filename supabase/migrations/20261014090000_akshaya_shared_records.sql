-- Billing/service records for the Akshaya PKP app.
-- No existing localStorage records are imported by this migration.
-- Access is server-only; no anon/authenticated table policies are created.
create table if not exists public.akshaya_shared_records (
  storage_key text not null,
  record_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (storage_key, record_id)
);

alter table public.akshaya_shared_records enable row level security;

create index if not exists akshaya_shared_records_key_updated_idx
  on public.akshaya_shared_records (storage_key, updated_at desc);

comment on table public.akshaya_shared_records is
  'Shared service/billing records written only by authenticated server routes using the Supabase service role. Existing browser localStorage data is not migrated automatically.';
