-- Phase 2-6 foundation: normalized business data, RLS, audit/backup metadata.
-- Safe to run once after Phase 1. Existing feature_permissions data is not deleted.

create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text unique,
  name text not null,
  mobile text,
  email text,
  address text,
  dob date,
  aadhaar_masked text,
  parent_name text,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_mobile_idx on public.customers (mobile);
create index if not exists customers_name_idx on public.customers (lower(name));

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  service_name text not null unique,
  category text,
  price numeric(12,2) not null default 0,
  active boolean not null default true,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_number text unique,
  customer_id uuid references public.customers(id) on delete set null,
  staff_name text,
  status text not null default 'paid',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  balance_amount numeric(12,2) not null default 0,
  payment_method text,
  notes text,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bills_customer_idx on public.bills(customer_id);
create index if not exists bills_created_idx on public.bills(created_at desc);
create index if not exists bills_status_idx on public.bills(status);

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bill_items_bill_idx on public.bill_items(bill_id);

create table if not exists public.service_entries (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references public.bills(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  staff_name text,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  status text not null default 'completed',
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_entries_created_idx on public.service_entries(created_at desc);
create index if not exists service_entries_customer_idx on public.service_entries(customer_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null default 0,
  staff_name text,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses(expense_date desc);
create index if not exists expenses_category_idx on public.expenses(category);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_name text,
  transaction_type text not null default 'credit',
  amount numeric(12,2) not null default 0,
  reference text,
  notes text,
  staff_name text,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_created_idx on public.wallet_transactions(created_at desc);

create table if not exists public.customer_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique,
  service_name text not null,
  audience text,
  customer_name text,
  mobile text,
  address text,
  document_names jsonb not null default '[]'::jsonb,
  status text not null default 'Submitted',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  raw_data jsonb not null default '{}'::jsonb
);

create index if not exists customer_applications_status_idx on public.customer_applications(status);
create index if not exists customer_applications_mobile_idx on public.customer_applications(mobile);
create index if not exists customer_applications_submitted_idx on public.customer_applications(submitted_at desc);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  staff_name text not null,
  attendance_date date not null default current_date,
  login_at timestamptz,
  logout_at timestamptz,
  source_legacy_id text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(staff_name, attendance_date)
);

create table if not exists public.data_audit_log (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id text,
  action text not null,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_audit_log_created_idx on public.data_audit_log(created_at desc);
create index if not exists data_audit_log_entity_idx on public.data_audit_log(entity_type, entity_id);

create table if not exists public.legacy_migration_snapshots (
  id bigint generated always as identity primary key,
  source_key text not null,
  payload jsonb not null,
  captured_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists bills_touch_updated_at on public.bills;
create trigger bills_touch_updated_at before update on public.bills for each row execute function public.touch_updated_at();
drop trigger if exists services_touch_updated_at on public.services;
create trigger services_touch_updated_at before update on public.services for each row execute function public.touch_updated_at();
drop trigger if exists service_entries_touch_updated_at on public.service_entries;
create trigger service_entries_touch_updated_at before update on public.service_entries for each row execute function public.touch_updated_at();
drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at before update on public.expenses for each row execute function public.touch_updated_at();
drop trigger if exists customer_applications_touch_updated_at on public.customer_applications;
create trigger customer_applications_touch_updated_at before update on public.customer_applications for each row execute function public.touch_updated_at();
drop trigger if exists attendance_logs_touch_updated_at on public.attendance_logs;
create trigger attendance_logs_touch_updated_at before update on public.attendance_logs for each row execute function public.touch_updated_at();

-- Phase 3: new business tables are deny-by-default to browser roles.
-- The current app still uses the legacy feature_permissions JSON store, so this
-- migration intentionally does NOT break the live UI. A later auth cutover
-- will grant authenticated access through explicit policies.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','services','bills','bill_items','service_entries',
    'expenses','wallet_transactions','customer_applications',
    'attendance_logs','data_audit_log','legacy_migration_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

-- Phase 4: preserve legacy JSON before any conversion.
create or replace function public.capture_legacy_snapshot(p_key text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.legacy_migration_snapshots(source_key, payload)
  values (p_key, coalesce(p_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.capture_legacy_snapshot(text, jsonb) from public;
grant execute on function public.capture_legacy_snapshot(text, jsonb) to service_role;

-- Migration health view for admin tooling.
create or replace view public.data_health_summary as
select 'customers'::text as entity, count(*)::bigint as rows from public.customers
union all select 'services', count(*) from public.services
union all select 'bills', count(*) from public.bills
union all select 'bill_items', count(*) from public.bill_items
union all select 'service_entries', count(*) from public.service_entries
union all select 'expenses', count(*) from public.expenses
union all select 'wallet_transactions', count(*) from public.wallet_transactions
union all select 'customer_applications', count(*) from public.customer_applications
union all select 'attendance_logs', count(*) from public.attendance_logs
union all select 'data_audit_log', count(*) from public.data_audit_log;

revoke all on public.data_health_summary from anon, authenticated;
grant select on public.data_health_summary to service_role;

comment on table public.customers is 'Phase 2 normalized customer master. raw_data preserves legacy fields during migration.';
comment on table public.bills is 'Phase 2 normalized bill header.';
comment on table public.bill_items is 'Phase 2 normalized bill line items.';
comment on table public.customer_applications is 'Phase 2 normalized customer application tracking.';
comment on table public.legacy_migration_snapshots is 'Phase 4 recovery snapshots of legacy JSON before migration.';
