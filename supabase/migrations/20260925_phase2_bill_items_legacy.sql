alter table public.bill_items add column if not exists source_legacy_id text;
create unique index if not exists bill_items_legacy_id_uq on public.bill_items(source_legacy_id) where source_legacy_id is not null;
