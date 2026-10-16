-- Shared customer action permissions for Income Affidavit QR form.
create table if not exists public.income_affidavit_settings (
  id text primary key default 'global' check (id = 'global'),
  allow_customer_preview boolean not null default false,
  allow_customer_print boolean not null default false,
  allow_customer_download boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.income_affidavit_settings enable row level security;
insert into public.income_affidavit_settings (id)
values ('global') on conflict (id) do nothing;
-- Access is mediated through the server API; no direct client policies.
