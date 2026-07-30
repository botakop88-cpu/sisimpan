-- ============================================================
-- SISIMPAN — Migrasi awal (M1: Setup & Foundation)
-- Jalankan lewat: supabase db push  (atau paste ke SQL Editor Supabase)
-- ============================================================

-- ---------- Tabel ----------

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  role        text not null default 'user' check (role in ('admin', 'user', 'viewer')),
  created_at  timestamptz not null default now()
);

create table if not exists cloud_accounts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  provider          text not null check (provider in ('google_drive', 'onedrive', 'dropbox')),
  provider_email    text not null,
  account_owner_type text not null default 'personal' check (account_owner_type in ('institution', 'personal')),
  access_token      text,          -- encrypted via Supabase Vault; short-lived, boleh dikirim ke browser
  refresh_token     text,          -- encrypted via Supabase Vault; TIDAK PERNAH dikirim ke browser
  oauth_scope       text default 'https://www.googleapis.com/auth/drive.file',
  storage_used      bigint not null default 0,
  storage_limit     bigint not null default 0,
  status            text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists files (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  name            text not null,
  mime_type       text,
  original_size   bigint not null,
  checksum_sha256 text not null,
  chunk_count     int not null default 1,
  status          text not null default 'uploading'
                  check (status in ('uploading', 'partial_failed', 'ready', 'failed', 'deleted')),
  upload_started_at timestamptz default now(),
  share_token     text unique,
  created_at      timestamptz not null default now()
);

create table if not exists file_chunks (
  id                uuid primary key default gen_random_uuid(),
  file_id           uuid not null references files(id) on delete cascade,
  chunk_index       int not null,
  chunk_size        bigint not null,
  checksum_sha256   text not null,
  cloud_account_id  uuid references cloud_accounts(id),
  remote_file_id    text not null,
  remote_path       text,
  status            text not null default 'ok' check (status in ('ok', 'missing', 'corrupted')),
  created_at        timestamptz not null default now()
);

create table if not exists activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  action      text not null check (action in ('upload', 'download', 'share', 'delete')),
  file_id     uuid references files(id) on delete set null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- Index ----------

create index if not exists idx_cloud_accounts_user on cloud_accounts(user_id);
create index if not exists idx_files_user on files(user_id);
create index if not exists idx_file_chunks_file on file_chunks(file_id);
create index if not exists idx_files_share_token on files(share_token);
create index if not exists idx_activity_logs_user on activity_logs(user_id, created_at desc);

-- ---------- Trigger: auto-buat profile saat user baru daftar ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Row Level Security ----------

alter table profiles enable row level security;
alter table cloud_accounts enable row level security;
alter table files enable row level security;
alter table file_chunks enable row level security;
alter table activity_logs enable row level security;

-- profiles: user cuma bisa baca/update profile sendiri; admin bisa baca semua
create policy "profiles_select_own_or_admin" on profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- cloud_accounts: user cuma bisa lihat/kelola akun cloud miliknya sendiri
create policy "cloud_accounts_owner_all" on cloud_accounts
  for all using (auth.uid() = user_id);

-- files: user cuma bisa lihat/kelola file miliknya sendiri
create policy "files_owner_all" on files
  for all using (auth.uid() = user_id);

-- file_chunks: ikut kepemilikan file induknya
create policy "file_chunks_owner_all" on file_chunks
  for all using (
    exists (select 1 from files f where f.id = file_chunks.file_id and f.user_id = auth.uid())
  );

-- activity_logs: user bisa lihat log miliknya sendiri; admin bisa lihat semua
create policy "activity_logs_select_own_or_admin" on activity_logs
  for select using (
    auth.uid() = user_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "activity_logs_insert_own" on activity_logs
  for insert with check (auth.uid() = user_id);
