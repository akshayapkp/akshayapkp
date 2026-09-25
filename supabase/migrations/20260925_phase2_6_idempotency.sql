-- Idempotency keys for the one-time legacy migration.
create unique index if not exists customers_legacy_id_uq on public.customers(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists services_legacy_id_uq on public.services(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists bills_legacy_id_uq on public.bills(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists service_entries_legacy_id_uq on public.service_entries(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists expenses_legacy_id_uq on public.expenses(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists wallet_transactions_legacy_id_uq on public.wallet_transactions(source_legacy_id) where source_legacy_id is not null;
create unique index if not exists attendance_logs_legacy_id_uq on public.attendance_logs(source_legacy_id) where source_legacy_id is not null;
