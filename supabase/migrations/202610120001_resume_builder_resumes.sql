-- Resume Builder: database storage for structured resume form data only.
-- No PDF files are stored. Keep RLS enabled; do not add public/anon write policies.
create table if not exists public.resume_builder_resumes (
  id uuid primary key default gen_random_uuid(),
  data jsonb not null default '{}'::jsonb,
  display_name text not null default '',
  mobile text not null default '',
  email text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resume_builder_resumes_created_by_updated_at_idx
  on public.resume_builder_resumes (created_by, updated_at desc);

alter table public.resume_builder_resumes enable row level security;

-- Intentionally no anon/authenticated policies here. The current application
-- uses localStorage-based login, not Supabase Auth, so public browser access
-- would expose personal resume data. Access must be added only after a
-- server-verified session is implemented.
