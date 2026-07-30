-- ============================================================
-- SISIMPAN — Migrasi M2 (Google Drive Connect)
-- Jalankan SETELAH 0001_init.sql, lewat SQL Editor Supabase yang sama.
-- ============================================================

-- Supaya bisa upsert saat user connect ulang akun Google yang sama
alter table cloud_accounts
  add constraint cloud_accounts_user_provider_email_key
  unique (user_id, provider_email);

-- Buat tahu kapan access_token perlu di-refresh (STOR-003)
alter table cloud_accounts
  add column if not exists token_expires_at timestamptz;
