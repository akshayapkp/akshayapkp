-- Staff table required by Staff Management and /api/auth/login.
-- RLS is enabled and there are intentionally no anon/authenticated policies.
-- Reads/writes are performed by authenticated server routes using the service key.
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
alter table public.staff enable row level security;
