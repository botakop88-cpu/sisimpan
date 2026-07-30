# SISIMPAN — Breakdown Task (Serverless)
## Daftar Tugas — Vercel + Supabase

Format: `[ID] - [TITLE] | Epic | Priority | Estimasi | Dependensi`

---

## EPIC A — Setup & Foundation

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| SETUP-001 | Init Next.js project + Tailwind + shadcn/ui | High | 1d | — |
| SETUP-002 | Setup Supabase project + DB schema (SQL migrasi) | High | 1d | SETUP-001 |
| SETUP-003 | Supabase Auth: email/password + OAuth Google | High | 2d | SETUP-002 |
| SETUP-004 | Deploy ke Vercel + env vars | High | 1d | SETUP-001 |
| SETUP-005 | Middleware proteksi route (auth guard) | High | 1d | SETUP-003 |

---

## EPIC B — Cloud Storage Integration

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| STOR-001 | Google Drive OAuth flow (connect account) — scope `drive.file` only, BUKAN full `drive` scope | High | 2d | SETUP-003 |
| STOR-002 | Simpan token encrypted di Supabase Vault (access_token short-lived, refresh_token server-only) | High | 1d | STOR-001 |
| STOR-003 | Refresh token otomatis saat expired (server-side only, refresh_token tidak pernah keluar ke browser) | High | 1d | STOR-001 |
| STOR-004 | Track kapasitas terpakai per akun | Medium | 1d | STOR-001 |
| STOR-005 | OneDrive OAuth integration | Low | 2d | STOR-001 |
| STOR-006 | Dropbox OAuth integration | Low | 2d | STOR-001 |

---

## EPIC C — Upload & File Management

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| FILE-001 | Client-side file splitter — HANYA jalan kalau file > sisa kapasitas 1 akun; split berdasarkan alokasi kapasitas per akun (bukan ukuran tetap 5MB) | High | 2d | SETUP-001 |
| FILE-002 | SHA-256 checksum per bagian file | High | 1d | FILE-001 |
| FILE-003 | Upload bagian file ke Google Drive pakai Resumable Upload API (browser → Drive langsung, access token scope `drive.file`) | High | 2d | STOR-001, FILE-001 |
| FILE-004 | Resume upload terputus — manfaatkan resumable session Drive (browser cuma lanjutkan session ID, tidak perlu re-track byte-offset manual) | Medium | 1d | FILE-003 |
| FILE-005 | Multi-account split (pilih akun optimal berdasar sisa kuota) | High | 2d | FILE-003, STOR-004 |
| FILE-006 | Simpan metadata bagian file ke Supabase | High | 1d | FILE-003 |
| FILE-007 | Download: ambil signed URL + merge di browser | High | 3d | FILE-006 |
| FILE-008 | Delete file + chunks di cloud | Medium | 1d | FILE-006 |
| FILE-009 | Share link publik (token + expiry) | Medium | 2d | FILE-007 |

---

## EPIC D — Dashboard & UI

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| UI-001 | Layout dashboard + sidebar | High | 1d | SETUP-005 |
| UI-002 | Halaman files (list, search, upload) | High | 3d | FILE-007 |
| UI-003 | FileUploader component (drag & drop + progress) | High | 2d | FILE-003 |
| UI-004 | Halaman storage (konek akun cloud) | Medium | 2d | STOR-001 |
| UI-005 | Ringkasan kapasitas dashboard | Medium | 1d | STOR-004 |
| UI-006 | Halaman settings (profile) | Low | 1d | SETUP-003 |

---

## EPIC E — Monitoring & Admin

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| MON-001 | Vercel Cron: health check tiap jam | High | 2d | FILE-006 |
| MON-002 | Loop chunk → cek ada di cloud | High | 2d | MON-001 |
| MON-003 | Tandai chunk missing + notif ke admin | Medium | 1d | MON-002 |
| MON-004 | Role management (Admin/Guru/Siswa) | Medium | 2d | SETUP-003 |
| MON-005 | Audit log (activity_logs) | Medium | 1d | FILE-006 |
| MON-006 | Halaman admin (users + logs) | Low | 2d | MON-004, MON-005 |

---

## EPIC F — Search & Polish

| ID | Task | Priority | Est | Dep |
|---|---|---|---|---|
| SRCH-001 | Search API (nama, tipe, ukuran) | High | 2d | FILE-006 |
| SRCH-002 | Filter + sort UI | Medium | 1d | SRCH-001 |
| SRCH-003 | Public share page (download tanpa login) | Medium | 1d | FILE-009 |
| SRCH-004 | 2FA (TOTP) via Supabase | Low | 2d | SETUP-003 |

---

## Ringkasan

- **Total task:** ~45
- **Epic:** 6 (A-F)
- **Estimasi total:** 9-14 minggu (1-2 dev)
- **Revisi:** FILE-003/FILE-004 lebih ringan dari estimasi awal karena logic resume/retry per-chunk dipakai dari Google Drive Resumable Upload API bawaan, bukan dibangun dari nol. Fokus dev jadi ke orkestrasi (pilih akun, split, tracking metadata), bukan reimplementasi upload protocol.

---

## Sprint Suggestion (2-week sprints)

- **Sprint 1:** SETUP-001 → SETUP-005 (Foundation + deploy)
- **Sprint 2:** STOR-001 → STOR-004 (Google Drive connect)
- **Sprint 3:** FILE-001 → FILE-006 (Upload + split + metadata)
- **Sprint 4:** FILE-007 → FILE-009 (Download + share) + UI-001,002
- **Sprint 5:** UI-003 → UI-006 (Upload UI + storage page)
- **Sprint 6:** MON-001 → MON-003 (Health check cron)
- **Sprint 7:** SRCH-001 → SRCH-003 (Search + public share)
- **Sprint 8:** MON-004 → MON-006 + SRCH-004 (Admin + 2FA polish)
