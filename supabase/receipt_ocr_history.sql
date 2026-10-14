-- Receipt OCR history
-- Run in the Supabase SQL Editor for the same project used by Akshaya PKP.
create table if not exists public.receipt_ocr_history (
  id uuid primary key,
  extracted_text text not null check (char_length(extracted_text) between 1 and 60000),
  source text not null default 'mobile-camera',
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receipt_ocr_history_created_at_idx
  on public.receipt_ocr_history (created_at desc);

alter table public.receipt_ocr_history enable row level security;

-- Intentionally create no anon/authenticated policies. All reads/updates/deletes
-- go through the Next.js server API, which verifies the staff session.
-- SUPABASE_SERVICE_ROLE_KEY must remain server-only (never NEXT_PUBLIC_).
