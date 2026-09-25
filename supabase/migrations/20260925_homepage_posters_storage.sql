-- Phase 1 storage setup for Akshaya Pookiparamba
-- Public poster/media bucket. Do NOT use this bucket for customer documents.
-- Phase 1: Homepage poster storage
-- Run this once in Supabase SQL Editor before using the new poster uploader.
-- Posters are public website media, not private customer documents.

insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'homepage-posters',
    'homepage-posters',
    true,
    8388608,
    array['image/jpeg','image/png','image/webp','image/gif']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "homepage posters public upload" on storage.objects;
create policy "homepage posters public upload"
on storage.objects
for insert
to public
with check (
  bucket_id = 'homepage-posters'
  and (storage.foldername(name))[1] = 'homepage'
);

drop policy if exists "homepage posters public delete" on storage.objects;
create policy "homepage posters public delete"
on storage.objects
for delete
to public
using (
  bucket_id = 'homepage-posters'
  and (storage.foldername(name))[1] = 'homepage'
);

