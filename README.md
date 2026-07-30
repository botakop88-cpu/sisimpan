# SISIMPAN — Cloud Storage Aggregator

Kelola banyak akun cloud (Google Drive, OneDrive, Dropbox) dari satu dashboard. File otomatis di-split dan didistribusikan ke semua akun yang terhubung — seperti RAID 0 untuk cloud storage.

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| **Multi-Account Pooling** | Hubungkan banyak akun Google Drive, OneDrive, dan Dropbox dalam satu pool penyimpanan |
| **File Upload/Download** | Upload file besar dengan chunking otomatis, download langsung dari browser |
| **Share Links** | Buat link publik dengan password opsional dan masa berlaku |
| **Search** | Cari file di semua provider dari satu kolom pencarian |
| **File Integrity** | SHA-256 checksum untuk setiap file dan chunk, verifikasi otomatis |
| **Recovery** | Deteksi chunk yang hilang, mekanisme pemulihan |
| **Activity Logs** | Catat semua aktivitas upload, download, share, delete |
| **Admin Panel** | Manajemen user, export CSV, monitoring sistem |
| **MFA** | Multi-factor authentication via TOTP |
| **Health Monitoring** | Cron job pengecekan kesehatan chunk secara berkala |

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (email/password + MFA)
- **Storage**: Google Drive API, OneDrive API, Dropbox API
- **Icons**: Material Symbols
- **Deploy**: Vercel

## Prasyarat

- Node.js 18+
- Akun [Supabase](https://supabase.com) (free tier)
- Akun [Google Cloud](https://console.cloud.google.com) (untuk Google Drive API)
- Akun [Azure](https://portal.azure.com) (untuk OneDrive API)
- Akun [Dropbox Developer](https://www.dropbox.com/developers) (untuk Dropbox API)
- [Vercel](https://vercel.com) untuk deployment (opsional)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/botakop88-cpu/SiSImpan.git
cd SiSImpan
npm install
```

### 2. Supabase

Buat project di [Supabase Dashboard](https://supabase.com/dashboard), lalu:

1. Buka **SQL Editor** dan jalankan file migration dari `supabase/migrations/` secara berurutan:
   - `0001_init.sql` — tabel & RLS
   - `0002_m2_storage.sql` — unique constraint & token expiry
   - `0003_m4_share.sql` — share link fields
   - `0004_m6_settings_monitoring.sql` — monitoring functions

2. Buka **Authentication > Settings** dan aktifkan:
   - **Email + Password** (sign up method)
   - **Google**, **Microsoft**, **Dropbox** (external OAuth)

### 3. Environment Variables

Salin `.env.local.example` ke `.env.local` dan isi:

```env
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# === App ===
NEXT_PUBLIC_APP_URL=http://localhost:3000

# === Encryption Key (generate: openssl rand -hex 32) ===
TOKEN_ENCRYPTION_KEY=

# === Google OAuth ===
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/storage/accounts/google/callback

# === Microsoft OneDrive OAuth ===
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/storage/accounts/onedrive/callback

# === Dropbox OAuth ===
DROPBOX_APP_KEY=
DROPBOX_APP_SECRET=
DROPBOX_REDIRECT_URI=http://localhost:3000/api/storage/accounts/dropbox/callback
```

### 4. OAuth Provider Setup

#### Google Drive
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat project → **APIs & Services → OAuth consent screen** (External)
3. **Credentials → Create OAuth client ID** (Web application)
4. Redirect URI: `http://localhost:3000/api/storage/accounts/google/callback`
5. Aktifkan **Google Drive API** di Library

#### OneDrive
1. Buka [Azure Portal](https://portal.azure.com) → **App Registrations**
2. **New registration** → Redirect URI: `http://localhost:3000/api/storage/accounts/onedrive/callback`
3. **API Permissions → Add** → Microsoft Graph → Delegated: `Files.ReadWrite.AppFolder`

#### Dropbox
1. Buka [Dropbox Developers](https://www.dropbox.com/developers/apps)
2. **Create app** → Scoped access → Full Dropbox
3. Redirect URI: `http://localhost:3000/api/storage/accounts/dropbox/callback`

### 5. Jalankan

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000), daftar akun, lalu hubungkan cloud storage di halaman **Storage**.

## Struktur Project

```
app/
├── (auth)/          # Login, Register, MFA Verify
├── (dashboard)/     # Dashboard, Files, Upload, Search, Storage, Share Links, Audit Log, Recovery, Settings, Admin
├── api/             # Route handlers (REST API)
│   ├── admin/       # User management, CSV export
│   ├── auth/        # OAuth callback
│   ├── cron/        # Health check, chunk verification
│   ├── files/       # CRUD, upload, download, share, search, recovery, dedup
│   ├── settings/    # Profile, password
│   ├── share/       # Public share link download
│   └── storage/     # OAuth connect/callback, account management
└── share/           # Public share page
components/
├── admin/           # User table, stat cards, activity log table
├── dashboard/       # Capacity tank component
├── download/        # Download hook
├── files/           # File row actions, search bar
├── settings/        # MFA section
├── storage/         # Account list
└── upload/          # File uploader, upload hook
lib/
├── cloud/           # Google Drive, OneDrive, Dropbox API clients, token manager, allocation, checksum
├── files/           # File search utility
└── supabase/        # Client, server, admin Supabase clients
supabase/migrations/ # Database schema migrations
```

## Deploy ke Vercel

```bash
npx vercel --prod
```

Set environment variables yang sama di Vercel Dashboard → Project Settings → Environment Variables.

## License

MIT
