# SISIMPAN — BRD / PRD (Serverless)
## Sistem Penyimpanan Cloud Aggregator

---

## 1. Ringkasan Eksekutif

| Item | Detail |
|---|---|
| Nama Produk | SISIMPAN (Sistem Penyimpanan Cloud Aggregator) |
| Arsitektur | Serverless — Vercel + Supabase |
| Biaya Infra | ~Rp 12.500/bulan (domain aja) |
| Target Rilis | Q1-Q2 2027 (3 fase) |

SISIMPAN menggabungkan beberapa akun cloud storage (Google Drive, OneDrive, dll) jadi satu antarmuka terpadu. **File TIDAK lewat server** — browser langsung kirim ke cloud storage user via OAuth, menggunakan scope terbatas (`drive.file`) sehingga akses app dibatasi hanya ke file yang dibuat oleh SISIMPAN sendiri.

### Problem Statement
- Institusi (sekolah/kampus/UKM) punya banyak akun cloud gratis — kapasitas besar tapi terfragmentasi.
- Tidak ada cara terpusat mengelola, memonitor, dan mencari file di semua akun.

### Value Proposition
- Satu dashboard, N akun cloud. Gratis (modal cuma domain).
- Split file besar otomatis + integrity check (SHA-256).
- Monitoring health link via cron.
- Search across semua storage.

---

## 2. Stack

| Layer | Teknologi | Biaya |
|---|---|---|
| Fullstack | Next.js 14+ App Router | Gratis |
| Deploy | Vercel (Hobby) | Gratis |
| DB + Auth | Supabase | Gratis |
| File | Google Drive / OneDrive API | Punya user |
| Cron | Vercel Cron Jobs | Gratis |

---

## 3. Target Pengguna

| Persona | Peran |
|---|---|
| Admin | Kelola sistem, akun cloud, user, laporan |
| Guru/Staf | Upload, kelola, cari file |
| Siswa | Download via link, cari file publik |

---

## 4. Fitur (Fase)

### Fase 1 (MVP)
- Auth (Supabase — email/password + OAuth Google)
- Dashboard ringkasan storage
- Konek Google Drive (OAuth, scope `drive.file` — bukan full access ke seluruh Drive user)
- Upload file (chunked per-akun untuk pooling kapasitas, resume) — langsung ke Drive via resumable upload API
- Multi-account + split otomatis (alasan utama: gabung kapasitas beberapa akun gratis, bukan siasat limit server)
- Download via link (merge chunks di browser)
- Search by nama file

### Fase 2
- Search lanjutan (filter, sort, tipe, ukuran)
- OneDrive / Dropbox integration
- Role-based access (Admin/Guru/Siswa)
- Audit log
- Health check cron tiap jam

### Fase 3
- Share link publik (password + expiry)
- Recovery file hilang
- Anti dedup
- Export laporan

---

## 5. Metrik Keberhasilan

1. Upload success rate > 95%
2. Link health > 90% (via cron)
3. Search latency < 2 detik
4. Minimal 10 akun cloud aktif per admin dalam 3 bulan

---

## 6. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Rate limit Google Drive API | Retry backoff, limit upload per akun |
| OAuth token expired | Refresh token di server |
| User tutup browser saat upload | Resume — track chunk progress di DB |
| Vercel cron min 1 jam | Cukup — file jarang hilang tiba-tiba |
| Access token bocor di browser (upload langsung dari client) | Pakai scope `drive.file` (bukan `drive` full-access) sehingga blast radius terbatas ke file buatan app saja; access token short-lived (~1 jam); refresh token TIDAK pernah dikirim ke browser, hanya disimpan encrypted di server |
