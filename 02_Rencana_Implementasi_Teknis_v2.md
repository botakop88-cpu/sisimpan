# SISIMPAN — Rencana Implementasi Teknis (Revisi)
## Serverless: Vercel + Supabase, Tanpa VPS

---

## 1. Stack Teknologi

| Layer | Teknologi | Alasan |
|---|---|---|
| **Fullstack** | Next.js 14+ (App Router) | Frontend + API routes dalam 1 framework |
| **Database + Auth** | Supabase | PostgreSQL + Auth + Realtime + Edge Functions, semua free |
| **Deployment** | Vercel | Deploy gratis, serverless functions, edge network |
| **Cloud Storage** | Google Drive API / OneDrive Graph API | File user disimpan di cloud mereka |
| **Background Job** | Vercel Cron Jobs | Health check link tiap jam, gratis |
| **Notifikasi** | Email (Supabase Auth) + Telegram Bot | Gratis |
| **Styling** | Tailwind CSS + shadcn/ui | Cepat, konsisten |
| **State** | React Server Components + Server Actions | Zero client-side state management |

### Yang TIDAK perlu:
- ~~VPS / Docker~~
- ~~Redis~~
- ~~Nginx~~
- ~~Go backend terpisah~~
- ~~Background worker process~~
- ~~PostgreSQL self-hosted~~

---

## 2. Arsitektur Sistem

```
[Browser User]
    │
    ├── OAuth login ─────────────────────────▶ [Supabase Auth]
    │                                              │
    ├── API calls ──────▶ [Vercel Serverless Functions]
    │                        │
    │                        ├──▶ [Supabase DB] (metadata, user, file map)
    │                        │
    │                        └──▶ [Google Drive / OneDrive API] (file langsung)
    │
    ├── Upload chunk ────▶ [Cloud Storage langsung via OAuth token]
    │                        (browser → Google Drive, bypass server)
    │
    ├── Download chunk ──▶ [Cloud Storage langsung via signed URL]
    │
    └── Monitor ─────────▶ [Vercel Cron] (tiap jam, cek health link)
```

### Prinsip Kunci:
**File TIDAK pernah lewat server.** Browser langsung kirim/ambil file ke cloud storage pakai OAuth token. Server cuma simpan metadata (nama, ukuran, lokasi chunk, checksum).

### Prinsip Keamanan — OAuth Scope Terbatas:
Google Drive API (beda dengan S3/R2) tidak punya mekanisme presigned URL native, jadi upload langsung dari browser mengharuskan **access token** ada di client. Ini aman selama scope dibatasi:

- **Scope yang dipakai:** `https://www.googleapis.com/auth/drive.file` — app HANYA bisa akses file/folder yang dibuat lewat app ini sendiri, TIDAK bisa lihat/ubah/hapus file lain di Drive user.
- **Access token**: short-lived (~1 jam), dikirim ke browser untuk upload/download langsung.
- **Refresh token**: TIDAK PERNAH dikirim ke browser. Disimpan encrypted di server (Supabase Vault), dipakai server untuk minta access token baru saat expired.
- Kalau access token bocor (XSS, dsb), blast radius terbatas ke file buatan SISIMPAN saja, dan otomatis expired dalam hitungan jam.
- Ini trade-off yang disadari: bukan sekuat presigned URL S3 (yang scoped ke 1 object + expiry pendek), tapi realistis dan gratis untuk Google Drive API.

---

## 3. Alur Kerja

### Upload (Client-side):
> **Catatan:** Chunking di sini tujuannya BUKAN menyiasati limit compute-time Vercel (karena upload tidak lewat Vercel function sama sekali), tapi untuk **memecah file ke beberapa akun Drive** supaya kapasitas gabungan dari banyak akun gratis bisa dipakai. Tiap chunk di-upload pakai **Google Drive Resumable Upload API** (native, sudah handle retry/resume sendiri) — bukan reinvent logic upload dari nol.

1. User pilih file → browser hitung SHA-256 checksum
2. Kirim metadata ke API (nama, ukuran, checksum) → API simpan ke Supabase
3. API tentukan pembagian file ke akun mana saja berdasarkan sisa kapasitas (lihat "Storage Pool" di bawah) → kalau file muat di 1 akun, tidak perlu displit sama sekali
4. Kalau perlu displit ke >1 akun: browser potong file jadi bagian-bagian sesuai alokasi akun
5. Browser dapat access token short-lived (scope `drive.file`) untuk tiap akun cloud dari API
6. Tiap bagian di-upload ke Google Drive pakai **resumable upload session** (Drive yang handle retry per-chunk internal, browser cuma perlu lanjutkan session kalau putus)
7. Browser laporkan status upload ke API → API update metadata
8. API verifikasi checksum tiap bagian → tandai selesai

### Download (Client-side):
1. Cari file → API return manifest (daftar chunk + lokasi)
2. Browser ambil signed URL / download link dari API
3. Browser download tiap chunk langsung dari cloud storage
4. Browser merge chunks → file utuh → user save

### Monitoring (Cron):
1. Vercel Cron jalankan tiap jam (GET /api/cron/health-check)
2. Loop semua file_chunks di DB → hit cloud API cek file masih ada
3. Kalau chunk hilang → tandai di DB + kirim notifikasi ke admin
4. Kalau semua chunk sehat → skip

### Storage Pool:
1. Admin tambah akun cloud → OAuth flow → token disimpan di Supabase
2. API track kapasitas terpakai per akun
3. Saat upload, API pilih akun dengan kapasitas terbanyak
4. Kalau file > 1 akun → split ke beberapa akun

---

## 4. Database Schema (Supabase / PostgreSQL)

```sql
-- Users (managed by Supabase Auth, extend dengan profile)
profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        TEXT,
  role        TEXT DEFAULT 'user',  -- admin / user / viewer
  created_at  TIMESTAMPTZ DEFAULT now()
)

-- Akun cloud yang terkoneksi
cloud_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  provider        TEXT NOT NULL,       -- google_drive / onedrive / dropbox
  provider_email  TEXT NOT NULL,
  access_token    TEXT,                -- encrypted via Supabase Vault; short-lived (~1 jam), boleh dikirim ke browser saat upload/download
  refresh_token   TEXT,                -- encrypted via Supabase Vault; TIDAK PERNAH dikirim ke browser, hanya dipakai server untuk refresh access_token
  oauth_scope     TEXT DEFAULT 'https://www.googleapis.com/auth/drive.file', -- scope terbatas, bukan full 'drive'
  storage_used    BIGINT DEFAULT 0,    -- bytes
  storage_limit   BIGINT DEFAULT 0,    -- bytes
  status          TEXT DEFAULT 'active', -- active / expired / revoked
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
)

-- File metadata
files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id),
  name            TEXT NOT NULL,
  mime_type       TEXT,
  original_size   BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  chunk_count     INT DEFAULT 1,
  status          TEXT DEFAULT 'uploading', -- uploading / ready / deleted
  share_token     TEXT UNIQUE,              -- buat share link publik
  created_at      TIMESTAMPTZ DEFAULT now()
)

-- Lokasi tiap chunk di cloud storage
file_chunks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id           UUID REFERENCES files(id) ON DELETE CASCADE,
  chunk_index       INT NOT NULL,
  chunk_size        BIGINT NOT NULL,
  checksum_sha256   TEXT NOT NULL,
  cloud_account_id  UUID REFERENCES cloud_accounts(id),
  remote_file_id    TEXT NOT NULL,   -- ID file di cloud (Google Drive file ID, dll)
  remote_path       TEXT,            -- path di cloud storage
  status            TEXT DEFAULT 'ok', -- ok / missing / corrupted
  created_at        TIMESTAMPTZ DEFAULT now()
)

-- Aktivitas
activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id),
  action      TEXT NOT NULL,          -- upload / download / share / delete
  file_id     UUID REFERENCES files(id),
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

### Indexes:
```sql
CREATE INDEX idx_cloud_accounts_user ON cloud_accounts(user_id);
CREATE INDEX idx_files_user ON files(user_id);
CREATE INDEX idx_file_chunks_file ON file_chunks(file_id);
CREATE INDEX idx_files_share_token ON files(share_token);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
```

---

## 5. Struktur Folder Proyek

```
sisimpan/
├── app/                          -- Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  -- landing / login redirect
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              -- dashboard utama
│   │   ├── files/page.tsx        -- daftar file, upload, search
│   │   ├── files/[id]/page.tsx   -- detail file + download
│   │   ├── storage/page.tsx      -- kelola akun cloud
│   │   ├── settings/page.tsx     -- profile, akun
│   │   └── admin/
│   │       ├── users/page.tsx
│   │       └── logs/page.tsx
│   ├── api/
│   │   ├── auth/                 -- OAuth callback handlers
│   │   │   ├── google/route.ts
│   │   │   └── onedrive/route.ts
│   │   ├── files/
│   │   │   ├── route.ts          -- list, create file metadata
│   │   │   ├── [id]/route.ts     -- detail, delete
│   │   │   ├── [id]/chunks/route.ts  -- upload chunk metadata
│   │   │   └── [id]/download/route.ts -- get signed URLs
│   │   ├── storage/
│   │   │   ├── accounts/route.ts -- list, add cloud accounts
│   │   │   └── accounts/[id]/route.ts -- remove account
│   │   ├── search/route.ts       -- search files
│   │   ├── share/
│   │   │   └── [token]/route.ts  -- public download link
│   │   └── cron/
│   │       └── health-check/route.ts -- monitoring cron
│   └── share/[token]/page.tsx    -- public share page
├── components/
│   ├── ui/                       -- shadcn/ui components
│   ├── upload/
│   │   ├── FileUploader.tsx      -- drag & drop + chunk logic
│   │   ├── UploadProgress.tsx    -- progress bar
│   │   └── useUpload.ts          -- hook upload client-side
│   ├── files/
│   │   ├── FileList.tsx
│   │   ├── FileCard.tsx
│   │   └── FileSearch.tsx
│   └── storage/
│       ├── AccountList.tsx
│       └── ConnectAccountButton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             -- browser client
│   │   ├── server.ts             -- server client (API routes)
│   │   └── admin.ts              -- service role client
│   ├── cloud/
│   │   ├── google-drive.ts       -- Google Drive API helpers
│   │   ├── onedrive.ts           -- OneDrive Graph API helpers
│   │   ├── types.ts              -- cloud provider interface
│   │   └── splitter.ts           -- file split/merge logic
│   ├── crypto.ts                 -- SHA-256 checksum
│   └── utils.ts
├── public/
├── .env.local
├── next.config.js
├── package.json
└── supabase/
    └── migrations/               -- SQL migrasi (managed)
```

---

## 6. Vercel API Routes (Endpoint List)

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | /api/storage/accounts | List akun cloud user |
| POST | /api/storage/accounts | Tambah akun cloud (OAuth) |
| DELETE | /api/storage/accounts/[id] | Hapus akun cloud |
| GET | /api/files | List file user |
| POST | /api/files | Buat file metadata (sebelum upload) |
| GET | /api/files/[id] | Detail file + chunk list |
| POST | /api/files/[id]/chunks | Simpan metadata chunk (setelah upload ke cloud) |
| GET | /api/files/[id]/download | Dapat signed URL tiap chunk |
| DELETE | /api/files/[id] | Hapus file + chunks di cloud |
| GET | /api/search?q= | Search file by nama/tipe/ukuran |
| GET | /api/share/[token] | Info file publik |
| GET | /api/share/[token]/download | Download file publik (merge chunks) |
| GET | /api/cron/health-check | Cron job: cek semua chunk masih ada |

---

## 7. Vercel Config

```js
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/health-check",
      "schedule": "0 * * * *"  // tiap jam
    }
  ],
  "functions": {
    "api/files/**": { "maxDuration": 30 },
    "api/cron/**": { "maxDuration": 60 }
  }
}
```

---

## 8. Milestone & Timeline

| Milestone | Fitur | Estimasi |
|---|---|---|
| M1 — Project Setup | Next.js + Supabase + auth + DB schema | 1-2 minggu |
| M2 — Google Drive Connect | OAuth flow + upload/download langsung ke Drive | 2-3 minggu |
| M3 — Chunked Upload + Split | Client-side split, multi-account, verifikasi checksum | 2-3 minggu |
| M4 — Dashboard UI | File list, storage overview, upload UI | 2 minggu |
| M5 — Search + Share | Search index, share link publik | 1-2 minggu |
| M6 — Monitoring + Admin | Cron health check, admin panel, role management | 1-2 minggu |
| **Total** | | **9-14 minggu** |

Lebih cepat dari sebelumnya (16-22 minggu) karena:
- No infra setup (Docker, Nginx, Redis)
- No backend server maintenance
- Supabase Auth built-in (gak bikin dari nol)
- Vercel deploy instant (push → deploy)

---

## 9. Biaya

| Item | Biaya |
|---|---|
| Vercel (Hobby) | Gratis (100GB bandwidth) |
| Supabase (Free tier) | Gratis (500MB DB, 1GB storage, 50k MAU) |
| Domain (IDwebhost) | ~Rp 150.000/tahun |
| **Total** | **~Rp 12.500/bulan** |

**Kapan harus bayar lebih:**
- Vercel Pro ($20/bulan) → kalau bandwidth > 100GB/bulan
- Supabase Pro ($25/bulan) → kalau DB > 500MB atau butuh point-in-time recovery

---

## 10. Kekurangan & Batasan

| Kekurangan | Dampak | Solusi |
|---|---|---|
| Vercel function timeout 10s (hobby) | Upload file > 10MB ke cloud lewat API susah | File upload BYPASS server — browser langsung ke cloud |
| Vercel cron min 1/jam | Health check cuma tiap jam | Cukup — file cloud jarang hilang tiba-tiba |
| Supabase free 500MB DB | Metadata file dibatasi | Cukup untuk ribuan file (metadata cuma ~1KB/file) |
| No real WebSocket | Realtime monitoring terbatas | Supabase Realtime (built-in) untuk update status |
| OAuth token expiry | Token perlu refresh | Server-side refresh di API route |
| No background upload recovery | Kalau browser tutup, upload gagal | Client-side resume via chunk tracking di DB |
