-- Shared custom form templates for the Akshaya PKP Affidavit & Form Writer.
-- Customer form submissions are deliberately not stored by this feature.
create table if not exists public.affidavit_form_templates (
  id text primary key check (id like 'custom\_%'),
  title text not null,
  subtitle text not null default '',
  declaration text not null default '',
  fields jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affidavit_form_templates_active_created_idx
  on public.affidavit_form_templates (is_active, created_at);

alter table public.affidavit_form_templates enable row level security;

-- All access goes through the authenticated Next.js API using the service role.
revoke all on table public.affidavit_form_templates from anon, authenticated;
