-- Shared Income Affidavit submissions for customer QR and staff history.
create table if not exists public.income_affidavit_submissions (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  applicant_name text not null default '',
  mobile text not null default '',
  house_name text not null default '',
  ration_card text not null default '',
  status text not null default 'pending' check (status in ('pending','printed','completed')),
  allow_customer_download boolean not null default false,
  source text not null default 'customer-qr' check (source in ('customer-qr','staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.income_affidavit_submissions enable row level security;
-- No client-side policies: all reads/writes must pass through server API using service role.
