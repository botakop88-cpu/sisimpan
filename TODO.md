# TODO.md — SISIMPAN

> Status per M6 (26 Juli 2026). Checklist di bawah sudah mencerminkan kode nyata.
> M6 selesai: OneDrive/Dropbox OAuth, Settings, Monitoring.

## Cara Pakai
```
claude --permission-mode acceptEdits -p "Kerjakan task di TODO.md secara berurutan mulai dari yang belum selesai. Update checklist setelah selesai."
```

---

## ✅ Fase 1 (MVP) — SELESAI (M1-M5)

### EPIC A — Setup & Foundation
- [x] SETUP-001 — Init Next.js + Tailwind + shadcn/ui
- [x] SETUP-002 — Supabase project + DB schema
- [x] SETUP-003 — Supabase Auth email/password + OAuth Google
- [x] SETUP-004 — Deploy Vercel + env vars
- [x] SETUP-005 — Middleware auth guard

### EPIC B — Cloud Storage Integration
- [x] STOR-001 — Google Drive OAuth (scope `drive.file`)
- [x] STOR-002 — Token encrypted (Supabase Vault / `lib/crypto.ts`)
- [x] STOR-003 — Refresh token otomatis (`lib/cloud/token-manager.ts`)
- [x] STOR-004 — Track kapasitas per akun

### EPIC C — Upload & File Management
- [x] FILE-001 — Client-side file splitter (`lib/cloud/allocation.ts`)
- [x] FILE-002 — SHA-256 checksum (`lib/cloud/checksum.ts`)
- [x] FILE-003 — Resumable upload ke Drive (`lib/cloud/drive-upload.ts`)
- [x] FILE-004 — Resume upload terputus
- [x] FILE-005 — Multi-account split (pilih akun optimal)
- [x] FILE-006 — Simpan metadata chunk ke Supabase
- [x] FILE-007 — Download + merge (`lib/cloud/drive-download.ts`, `use-download.ts`)
- [x] FILE-008 — Delete file + chunks (soft delete)
- [x] FILE-009 — Share link publik (`app/share/[token]`, `api/share/[token]`)

### EPIC D — Dashboard & UI
- [x] UI-001 — Layout dashboard + sidebar
- [x] UI-002 — Halaman files (list, search, upload)
- [x] UI-003 — FileUploader component
- [x] UI-004 — Halaman storage (konek akun cloud)
- [x] UI-005 — Ringkasan kapasitas dashboard (`capacity-tank.tsx`)
- [x] UI-006 — Halaman settings (profile, ganti password, lihat akun terhubung) ✅ M6

### EPIC E — Monitoring & Admin
- [x] MON-001 — Vercel Cron: health check tiap jam (`vercel.json` + `app/api/cron/health-check/route.ts`) ✅ M6
- [x] MON-002 — Loop chunk → cek eksistensi di cloud (`app/api/cron/verify-chunks/route.ts`) ✅ M6
- [x] MON-003 — Tandai chunk `missing` + notifikasi via log ✅ M6
- [x] MON-004 — Role management (Admin/Guru/Siswa) — ✅ Fase 3. Implementasi: API role change + dropdown di tabel admin. Enum tetap `admin/user/viewer`.
- [x] MON-005 — Audit log (`activity_logs` — sudah terisi dari tiap aksi: upload/download/share/delete) ✅ M6
- [x] MON-006 — Halaman admin (kelola user + lihat audit log) — **sekarang pakai data asli dari Supabase** ✅ M6

### EPIC F — Search & Polish (sisa)
- [x] SRCH-004 — 2FA (TOTP) via Supabase ✅ Fase 3

---
## ✅ Fase 2 — SELESAI (M6)

### EPIC B — Cloud Storage Integration
- [x] STOR-005 — OneDrive OAuth integration ✅ M6
- [x] STOR-006 — Dropbox OAuth integration ✅ M6

### EPIC D — Dashboard & UI
- [x] UI-006 — Halaman settings (profile, ganti password, lihat akun terhubung) ✅ M6

### EPIC E — Monitoring & Admin
- [x] MON-001 — Vercel Cron: health check tiap jam ✅ M6
- [x] MON-002 — Loop chunk → cek eksistensi di cloud ✅ M6
- [x] MON-003 — Tandai chunk `missing` + notifikasi ke admin ✅ M6
- [x] MON-004 — Role management ✅ Fase 3
- [x] MON-005 — Audit log (isi `activity_logs` dari tiap aksi) ✅ M6
- [x] MON-006 — Halaman admin (data asli) ✅ M6

### EPIC F — Search & Polish (sisa)
- [x] SRCH-004 — 2FA (TOTP) via Supabase ✅ Fase 3

---

## ✅ Fase 3 — SELESAI
- [x] Recovery file hilang (pakai data dari MON-002/003)
- [x] Anti dedup
- [x] Export laporan / backup berkala
- [x] SRCH-004 — 2FA (TOTP) via Supabase

---

## 🎨 Design System (dari stitch_sisimpan_cloud_storage_aggregator.zip)
- `DESIGN.md` di dalam zip = sumber kebenaran visual (lihat CLAUDE.md §3b untuk detail token).
- Mockup yang sudah dikonversi ke kode: **Admin Panel** (`admin-panel-components.zip`).
- Token warna/font sudah didaftarkan sebagai CSS variable + Tailwind `@theme` di `app/globals.css`.

## ⚠️ Wajib Dibaca Sebelum Lanjut (dari 04_Analisis_Risiko_Teknis.md)
- **OAuth consent screen masih \"Unverified App\"** — kalau target user > 100 orang, verifikasi Google WAJIB dikejar.
- **Risiko ToS Google Drive** untuk pemakaian institusi — rate-limiting sudah wajib (ada di CLAUDE.md).
- **`account_owner_type`** (`institution`/`personal`) — pastikan kolom ini sudah ada di skema sebelum menambah provider baru.

## 📝 Task yang Butuh Konfirmasi Manual
- Submit OAuth consent screen ke Google untuk verifikasi (butuh domain asli, privacy policy, video demo)
- Deploy production / ganti env var production di Vercel
- Menambah scope OAuth baru di luar `drive.file` / setara
- **MON-004 — Role management**: putuskan pakai enum `admin/user/viewer` (yang sudah ada) atau migrasi ke `admin/guru/siswa` (sesuai BRD)
