-- Restore the staff table required by the existing login and Staff Management code.
-- This migration creates the schema only; it does not delete or overwrite any data.
-- Existing app code currently accesses this table directly through the anon Supabase client.
-- Security hardening should move Staff Management CRUD behind server-verified routes before enabling RLS.

create table if not exists public.staff (
  id text primary key,
  staff_id text not null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  role text not null default 'Staff',
  salary numeric not null default 0,
  upi_id text not null default '',
  password text not null,
  created_at timestamptz not null default now()
);

create index if not exists staff_staff_id_idx on public.staff (staff_id);
create index if not exists staff_name_idx on public.staff (name);

-- Deliberately does not seed accounts or change existing records.
