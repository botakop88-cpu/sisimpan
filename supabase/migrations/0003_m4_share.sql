-- ============================================================
-- SISIMPAN — Migrasi M4 (Download + Share Link)
-- Jalankan SETELAH 0001 dan 0002, lewat SQL Editor Supabase yang sama.
-- ============================================================

-- share_token sudah ada dari 0001_init.sql (kolom + unique index).
-- Tambahan untuk fitur password opsional + masa berlaku link:
alter table files
  add column if not exists share_password_hash text,
  add column if not exists share_expires_at timestamptz;

-- CATATAN KEAMANAN: kita SENGAJA TIDAK bikin RLS policy "siapa saja boleh
-- SELECT baris yang share_token IS NOT NULL". Kenapa: NEXT_PUBLIC_SUPABASE_ANON_KEY
-- ada di browser bundle, jadi kalau RLS-nya cuma syarat "share_token is not null"
-- (tanpa tahu token spesifik yang diminta), siapa pun bisa query langsung ke
-- Supabase pakai anon key dan dapat SEMUA file yang lagi di-share, bukan cuma
-- yang token-nya dia tahu.
--
-- Solusinya: endpoint publik (/api/share/[token]/*) pakai SERVICE ROLE KEY
-- (createAdminClient, bypass RLS) di server, dan pencocokan token dilakukan
-- eksplisit di kode API (.eq('share_token', token)) -- bukan diserahkan ke RLS.
-- Route publik ini juga membatasi kolom yang dikembalikan ke client (nama,
-- ukuran, status password) -- tidak pernah mengembalikan seluruh baris mentah.
