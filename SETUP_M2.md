# SISIMPAN — Setup M2 (Connect Google Drive)

Lanjutan dari M1. Panduan ini fokus ke bagian yang beda: konfigurasi Google Cloud Console supaya fitur "Connect Google Drive" bisa jalan.

## Yang sudah dibuat di M2 ini

- `lib/crypto.ts` — enkripsi/dekripsi token (AES-256-GCM, key hanya di server)
- `lib/cloud/google-drive.ts` — helper OAuth URL, tukar code, refresh token, ambil quota (scope `drive.file` saja, sesuai keputusan keamanan yang kita bahas)
- `lib/cloud/token-manager.ts` — `ensureValidAccessToken()`, auto-refresh kalau access token hampir/sudah expired (STOR-003)
- Route OAuth: `/api/storage/accounts/google/connect` (mulai flow) dan `/api/storage/accounts/google/callback` (terima balikan dari Google)
- `/api/storage/accounts` (list), `/api/storage/accounts/[id]` (delete, dengan pengecekan chunk yang masih bergantung), `/api/storage/accounts/[id]/sync-quota` (refresh kuota manual)
- Halaman `/storage` — UI daftar akun cloud + tombol connect/sync/putuskan
- Migrasi tambahan `0002_m2_storage.sql` — constraint unique + kolom `token_expires_at`

## Langkah Setup

### 1. Jalankan migrasi tambahan

Di Supabase SQL Editor, jalankan isi `supabase/migrations/0002_m2_storage.sql` (setelah migrasi M1 sebelumnya sudah jalan).

### 2. Buat Google Cloud Project

1. Buka https://console.cloud.google.com → buat project baru (misal `sisimpan`)
2. Di sidebar, buka **APIs & Services → Library**, cari **Google Drive API**, klik **Enable**

### 3. Setup OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. User Type: **External** (kecuali institusi kamu punya Google Workspace, baru bisa pilih Internal)
3. Isi App name (`SISIMPAN`), support email, developer contact email
4. Scopes: tambahkan `.../auth/drive.file`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
5. Test users: tambahkan email Google kamu sendiri dulu (dan email lain yang mau testing) — **wajib** selama app masih status Testing, maksimal 100 email
6. Simpan. App otomatis berstatus **Testing** — cukup untuk development, belum perlu submit verifikasi dulu (lihat catatan risiko di `04_Analisis_Risiko_Teknis.md` soal kapan verifikasi wajib dikejar)

### 4. Buat OAuth Client ID

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: bebas, misal `SISIMPAN Web`
4. **Authorized redirect URIs** — tambahkan persis:
   ```
   http://localhost:3000/api/storage/accounts/google/callback
   ```
   (Nanti kalau sudah deploy ke Vercel, tambahkan juga URL production-nya di sini, misal `https://sisimpan.vercel.app/api/storage/accounts/google/callback`)
5. Klik **Create** → copy **Client ID** dan **Client Secret**

### 5. Isi environment variables

Di `.env.local`, isi bagian yang masih kosong:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Generate sekali di terminal: openssl rand -hex 32
TOKEN_ENCRYPTION_KEY=<hasil openssl rand -hex 32>

GOOGLE_CLIENT_ID=<dari langkah 4>
GOOGLE_CLIENT_SECRET=<dari langkah 4>
GOOGLE_REDIRECT_URI=http://localhost:3000/api/storage/accounts/google/callback
```

> Kalau belum punya `openssl` di Windows, bisa generate `TOKEN_ENCRYPTION_KEY` lewat Node: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 6. Jalankan dan test

```bash
npm run dev
```

1. Login ke SISIMPAN (akun yang sudah didaftarkan di M1)
2. Buka `/storage`
3. Klik **+ Connect Google Drive**
4. Kamu akan diarahkan ke consent screen Google — karena app masih status Testing, akan muncul warning "Google hasn't verified this app". Klik **Advanced → Go to SISIMPAN (unsafe)** untuk lanjut (ini normal selama development, hanya muncul untuk test user yang kamu daftarkan)
5. Approve izin akses
6. Harus balik ke `/storage` dengan pesan "Akun Google Drive berhasil terkoneksi" dan akun muncul di daftar beserta kapasitasnya

### 7. Test fitur lain

- **Sync Kuota**: klik tombol ini di salah satu akun, kapasitas harusnya ke-refresh (cocokkan dengan kapasitas asli akun Drive kamu di drive.google.com)
- **Putuskan**: klik tombol ini, akun harus hilang dari daftar (karena belum ada file/chunk, tidak akan kena blokir "account_has_dependent_chunks")
- **Connect ulang akun yang sama**: connect lagi email Google yang sama → harusnya ter-upsert (update baris lama), bukan bikin duplikat

## Kalau ada error

- **"redirect_uri_mismatch"** → redirect URI di `.env.local` harus PERSIS sama (termasuk trailing slash) dengan yang didaftarkan di Google Cloud Console langkah 4
- **"Access blocked: SISIMPAN has not completed Google verification"** tanpa opsi Advanced → email kamu belum ditambahkan sebagai Test user (ulangi langkah 3 poin 5)
- **`no_refresh_token_try_disconnect_first`** → biasanya karena Google tidak reissue refresh_token untuk akun yang sudah pernah kamu authorize sebelumnya di app lain dengan client ID sama. Coba cabut akses SISIMPAN dari https://myaccount.google.com/permissions lalu connect ulang
- **`TOKEN_ENCRYPTION_KEY belum di-set`** → cek lagi `.env.local`, restart `npm run dev` setelah edit env

## Yang BELUM ada (menyusul di M3)

- Upload file betulan ke akun yang sudah terkoneksi (sekarang baru bisa connect + lihat kuota, belum ada tombol upload)
- Split file ke multi-akun otomatis
- Halaman `/files` masih belum dibuat (link di sidebar akan 404 kalau diklik — itu memang scope M4)
