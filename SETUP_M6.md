# SETUP_M6.md — Milestone 6: OneDrive/Dropbox OAuth, Settings, Monitoring

## Yang Dibuat

### 🔐 OneDrive OAuth (STOR-005)
- `lib/cloud/onedrive.ts` — Helper OAuth OneDrive: build auth URL, exchange code, refresh token, user info, kuota
- `app/api/storage/accounts/onedrive/connect/route.ts` — Redirect ke consent screen Microsoft
- `app/api/storage/accounts/onedrive/callback/route.ts` — Terima callback, simpan token, redirect ke /storage
- Scope: `Files.ReadWrite.AppFolder` (setara `drive.file` — hanya akses AppFolder)

### 🔐 Dropbox OAuth (STOR-006)
- `lib/cloud/dropbox.ts` — Helper OAuth Dropbox: build auth URL, exchange code, refresh token, user info, kuota
- `app/api/storage/accounts/dropbox/connect/route.ts` — Redirect ke consent screen Dropbox
- `app/api/storage/accounts/dropbox/callback/route.ts` — Terima callback, simpan token, redirect ke /storage
- Scope: `files.content.write` + `files.content.read` + `account_info.read`

### 🔧 Token Manager Multi-Provider (refactor)
- `lib/cloud/token-manager.ts` — Sekarang support Google Drive, OneDrive, Dropbox via `REFRESHERS` map
- Fungsi `getRefresher(provider)` untuk akses manual kalau diperlukan

### ⚙️ Halaman Settings (UI-006)
- `app/(dashboard)/settings/page.tsx` — Client component: edit nama, ganti password, lihat info akun
- `app/api/settings/profile/route.ts` — GET (ambil profile) + PATCH (update nama)
- `app/api/settings/password/route.ts` — POST (ganti password via Supabase Auth)
- Sidebar sudah punya link `/settings` (dari M5)

### 📊 Monitoring & Admin (EPIC E)

**Health Check (MON-001):**
- `app/api/cron/health-check/route.ts` — Cek: DB, akun expired, chunk missing, kuota per provider
- Dijadwalkan tiap jam via `vercel.json`

**Verifikasi Chunk (MON-002/003):**
- `app/api/cron/verify-chunks/route.ts` — Loop chunk `ok`, cek ke provider cloud (Google/OneDrive/Dropbox), tandai `missing` kalau file remote sudah tidak ada
- Rate-limit: 250ms delay antar request (max ~4 req/detik)
- Dijadwalkan tiap 6 jam via `vercel.json`

**Audit Log (MON-005):**
- `lib/activity-log.ts` — Fungsi `logActivity()` untuk catat upload/download/share/delete
- Sudah diintegrasikan ke route: `POST /api/files` (upload), `GET .../download` (download), `POST .../share` (share), `DELETE .../[id]` (delete)

**Halaman Admin real data (MON-006 fix):**
- `app/(dashboard)/admin/page.tsx` — Sekarang pakai data asli dari Supabase (tidak lagi mock data)

### 📋 Database Migration
- `supabase/migrations/0004_m6_settings_monitoring.sql` — Index + fungsi bantu admin

### 🌐 Environment Variables Baru
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` — Azure App Registration
- `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REDIRECT_URI` — Dropbox App Console

### 📦 Vercel Cron Config
- `vercel.json` — Jadwal cron: health check tiap jam, verify chunks tiap 6 jam

## Cara Testing Manual

### Test OneDrive OAuth
1. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI` di `.env.local`
2. Di Azure Portal, daftarkan redirect URI: `http://localhost:3000/api/storage/accounts/onedrive/callback`
3. Jalankan `npm run dev`
4. Login, buka `/storage`
5. Klik tombol "+ Connect OneDrive"
6. Login ke akun Microsoft, approve consent screen
7. Harus redirect ke `/storage?connected=1`, akun muncul di daftar

### Test Dropbox OAuth
1. Set `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REDIRECT_URI` di `.env.local`
2. Di Dropbox App Console, daftarkan redirect URI: `http://localhost:3000/api/storage/accounts/dropbox/callback`
3. Ulang langkah 3-7 di atas, klik "+ Connect Dropbox"

### Test Settings
1. Buka `/settings`
2. Lihat info profil (email, role, gabung sejak)
3. Ubah nama → klik Simpan → harus sukses
4. Ganti password → isi current + new + confirm → harus sukses

### Test Audit Log (Admin)
1. Upload file via `/files` → buka `/admin` → lihat log upload muncul
2. Share file → log share muncul
3. Download file → log download muncul
4. Delete file → log delete muncul

### Test Health Check
1. Akses langsung: `curl http://localhost:3000/api/cron/health-check`
2. Response JSON: status, durasi, cek database, expired accounts, missing chunks, provider quota

### Test Verify Chunks
1. Akses langsung: `curl http://localhost:3000/api/cron/verify-chunks`
2. Response JSON: jumlah chunk dicek, missing, error

## Batasan yang Disengaja
- **OneDrive**: cuma pakai `AppFolder` — tidak bisa akses file di luar AppFolder user. Ini setara `drive.file` Google.
- **Dropbox**: scope `files.content.write` + `files.content.read` — app cuma bisa akses folder aplikasi, bukan seluruh Dropbox.
- **Unshare tidak masuk audit log** — aktivitas mencabut share link tidak dicatat (terlalu detail untuk MVP).
- **Verify chunks** hanya cek 50 chunk per run (tanpa pagination) — cukup untuk deteksi dini, full scan perlu scheduler yang lebih heavy.
- **Admin page masih limit** — daftar user dibatasi 200 via admin API (Supabase listUsers default page size).
- **Role management (MON-004)** belum dikerjakan — masih pakai enum `admin/user/viewer` seperti skema M1.

## Kalau Ada Error

### "Gagal tukar code dengan token Microsoft"
- Pastikan `MICROSOFT_CLIENT_SECRET` benar
- Pastikan redirect URI di Azure Portal tepat (case-sensitive, trailing slash penting)
- Cek Azure Portal → App Registration → Certificates & Secrets, pastikan client secret belum expired

### "Gagal tukar code dengan token Dropbox"
- Pastikan `DROPBOX_APP_KEY` dan `DROPBOX_APP_SECRET` benar
- Pastikan redirect URI di Dropbox App Console tepat
- Di Dropbox App Console, pastikan app punya scope `files.content.write` dan `files.content.read`

### "Gagal refresh access token"
- Token mungkin sudah dicabut user dari sisi provider
- Cek status akun di DB (`cloud_accounts.status`) — kalau `expired`, suruh user connect ulang

### Admin page error
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` di-set — admin client butuh service role key untuk bypass RLS dan ambil daftar auth users.
