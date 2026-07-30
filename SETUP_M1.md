# SISIMPAN — Setup M1 (Project Setup + Auth + DB Schema)

Ini panduan menjalankan hasil M1 di komputer kamu. Semua langkah gratis.

## Yang sudah dibuat di M1 ini

- Project Next.js 14+ App Router + TypeScript + Tailwind
- Supabase client (browser, server, admin) — `lib/supabase/*.ts`
- Middleware auth guard — route `/dashboard`, `/files`, `/storage`, `/settings`, `/admin` otomatis redirect ke `/login` kalau belum login
- Halaman login (email/password + tombol Google) dan register
- Dashboard kosong yang menampilkan ringkasan akun cloud & file (masih 0 karena belum ada data — itu normal, fitur connect Drive baru di M2)
- Migrasi SQL skema lengkap sesuai rencana teknis (`profiles`, `cloud_accounts`, `files`, `file_chunks`, `activity_logs`) + Row Level Security aktif dari awal
- Trigger otomatis: begitu user daftar, baris `profiles` langsung dibuat

## Langkah Setup

### 1. Buat project Supabase (gratis)

1. Buka https://supabase.com → Sign up / login (bisa pakai akun GitHub)
2. Klik **New Project**
3. Isi nama project (misal `sisimpan`), pilih region terdekat (Singapore paling dekat ke Indonesia), buat password DB (simpan baik-baik)
4. Tunggu ~2 menit sampai project selesai di-provision

### 2. Ambil kredensial Supabase

Di dashboard project → **Project Settings → API**, copy:
- `Project URL` → jadi `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → jadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (klik "Reveal") → jadi `SUPABASE_SERVICE_ROLE_KEY`

### 3. Jalankan migrasi SQL

Cara termudah tanpa install CLI apa pun:
1. Di dashboard Supabase, buka **SQL Editor**
2. Klik **New query**
3. Copy seluruh isi file `supabase/migrations/0001_init.sql`, paste, klik **Run**
4. Cek di **Table Editor** — harus muncul tabel `profiles`, `cloud_accounts`, `files`, `file_chunks`, `activity_logs`

### 4. Aktifkan Google OAuth untuk LOGIN (opsional, boleh dilewati dulu)

Ini OAuth untuk fitur "Masuk dengan Google" di halaman login — **beda** dengan OAuth "Connect Google Drive" yang baru dikerjakan di M2.

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Aktifkan, isi Client ID & Secret dari Google Cloud Console (buat OAuth Client terpisah untuk ini kalau mau, atau pakai yang sama nanti di M2 — didiskusikan lagi saat M2)
3. Kalau belum mau setup ini dulu, tidak masalah — cukup pakai email/password dulu untuk testing

### 5. Setup environment variables

```bash
cp .env.local.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dengan nilai dari langkah 2. Baris `GOOGLE_*` biarkan kosong dulu, itu untuk M2.

### 6. Install dependencies & jalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000 — otomatis redirect ke `/login`.

### 7. Test alur

1. Klik **Daftar**, isi nama/email/password
2. Supabase kirim email konfirmasi (cek inbox, termasuk folder spam)
3. Klik link konfirmasi di email
4. Kembali ke `/login`, masuk pakai email/password tadi
5. Harus masuk ke `/dashboard` dan lihat ringkasan (masih kosong, itu normal)
6. Coba akses `/dashboard` di tab **incognito** tanpa login → harus otomatis dilempar ke `/login` (ini test middleware auth guard)

## Struktur folder yang relevan

```
sisimpan/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (dashboard)/layout.tsx      -- sidebar + auth check
│   ├── (dashboard)/page.tsx        -- dashboard ringkasan
│   ├── api/auth/callback/route.ts  -- callback OAuth login Google
│   └── page.tsx                    -- redirect ke /login atau /dashboard
├── components/
│   └── logout-button.tsx
├── lib/supabase/
│   ├── client.ts   -- dipakai di Client Component
│   ├── server.ts   -- dipakai di Server Component & Route Handler
│   └── admin.ts    -- service role, HANYA server-side, bypass RLS
├── middleware.ts    -- auth guard untuk /dashboard, /files, /storage, dst
└── supabase/migrations/0001_init.sql
```

## Yang BELUM ada (menyusul di milestone berikutnya)

- M2: Connect Google Drive (OAuth `drive.file`, simpan token di `cloud_accounts`)
- M3: Upload chunked + split multi-akun
- M4: Halaman file & storage yang fungsional (sekarang linknya ada di sidebar tapi halamannya belum dibuat — akan 404 kalau diklik)

## Kalau ada error umum

- **"Invalid API key"** → cek `.env.local` sudah benar dan sudah restart `npm run dev` setelah edit env
- **Redirect loop ke /login terus** → pastikan sudah klik link konfirmasi di email sebelum login
- **Tabel tidak muncul di Table Editor** → cek lagi apakah SQL di langkah 3 berhasil jalan tanpa error (scroll ke bawah di SQL Editor buat lihat pesan error kalau ada)
