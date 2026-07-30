-- ============================================================
-- SISIMPAN — Migrasi M6 (OneDrive/Dropbox OAuth, Settings, Monitoring)
-- Jalankan SETELAH 0003_m4_share.sql di SQL Editor Supabase.
-- ============================================================

-- Tambahkan kolom updated_at di profiles (dipakai settings page)
alter table profiles
  add column if not exists updated_at timestamptz default now();

-- Fungsi bantu: jam tersibuk hari ini (dipakai admin page)
create or replace function get_busiest_hour_today()
returns table (hour int, activity_count bigint)
language sql
security definer
as $$
  select
    extract(hour from created_at)::int as hour,
    count(*)::bigint as activity_count
  from activity_logs
  where created_at::date = current_date
  group by hour
  order by activity_count desc
  limit 1;
$$;

-- Index untuk performance query admin + monitoring
create index if not exists idx_activity_logs_date on activity_logs(created_at desc);
create index if not exists idx_cloud_accounts_provider on cloud_accounts(provider);
create index if not exists idx_file_chunks_status on file_chunks(status);
