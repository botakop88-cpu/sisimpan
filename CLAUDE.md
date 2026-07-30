@AGENTS.md

# CLAUDE.md — SISIMPAN (Sistem Penyimpanan Cloud Aggregator)

> Baris `@AGENTS.md` di atas WAJIB tetap di baris pertama — itu convention Next.js codegen,
> jangan dihapus. Aturan di bawah ini adalah tambahan khusus project SISIMPAN.

## 1. Identitas Project
- **Nama**: SISIMPAN — agregator cloud storage (gabung banyak akun Google Drive/OneDrive/Dropbox jadi 1 dashboard)
- **Stack**: Next.js 14+ App Router + TypeScript + Tailwind + shadcn/ui, Supabase (DB/Auth/Vault), Vercel (deploy + cron)
- **Status saat ini**: Milestone 5 (M5) selesai — lihat `SETUP_M1.md` s/d `SETUP_M5.md` untuk histori tiap milestone
- **Sumber kebenaran spesifikasi**: `01_BRD_PRD_v2.md`, `02_Rencana_Implementasi_Teknis_v2.md`, `03_Breakdown_Task_v2.md`, `04_Analisis_Risiko_Teknis.md` (baca semua sebelum mengerjakan task baru — jangan asumsi)

## 2. Mode Kerja
- Kerjakan task dari `TODO.md` berurutan per Epic, sesuai dependency yang tertulis.
- Setiap milestone baru **wajib** dibuatkan `SETUP_M{n}.md` baru (ikuti format M1-M5 yang sudah ada: apa yang dibuat, cara testing manual, batasan yang disengaja, error umum).
- Jangan berhenti tanya untuk keputusan kecil (nama variabel, struktur komponen). Ambil keputusan konsisten dengan pola yang sudah ada di codebase (misal: pola `lib/cloud/*.ts` untuk logic storage, `use-*.ts` hook untuk logic client).
- **Wajib berhenti dan tanya** kalau:
  - Mengubah skema keamanan yang sudah ditetapkan (lihat Batasan Keras di bawah)
  - Perlu API key/credential baru (OneDrive App ID, Dropbox App Key, dll) yang belum ada di `.env.local.example`
  - Task menyentuh sistem pembayaran/billing (belum ada di scope MVP)

## 3. Batasan Keras — JANGAN DILANGGAR (alasan keamanan/legal, bukan gaya kode)
- **Scope OAuth Google Drive HARUS `drive.file`**, tidak pernah full scope `drive`. Ini keputusan arsitektur, bukan detail implementasi — lihat `01_BRD_PRD_v2.md` §6 dan `04_Analisis_Risiko_Teknis.md` §1.
- **`refresh_token` tidak boleh pernah dikirim ke browser** — hanya disimpan encrypted (lihat `lib/crypto.ts` + Supabase Vault) dan dipakai server-side saja (`lib/cloud/token-manager.ts`). `access_token` boleh dipakai client karena short-lived (~1 jam) dan scope terbatas.
- **Upload file langsung dari browser ke Google Drive** (resumable upload API) — file TIDAK pernah lewat server SISIMPAN. Jangan ubah arsitektur ini jadi proxy-upload lewat server tanpa didiskusikan dulu (mengubah blast-radius keamanan & biaya bandwidth Vercel).
- **Rate-limit request ke Google Drive API sisi aplikasi** (maks ~5 req/detik per akun), walau kuota resmi mengizinkan lebih — ini mitigasi risiko suspend akun (lihat `04_Analisis_Risiko_Teknis.md` §2), bukan optimisasi performa yang boleh dihapus.
- **Delete file = soft delete** (`status = 'deleted'` di DB) setelah bytes benar-benar terhapus dari Drive. Jangan ubah jadi hard-delete row — dibutuhkan untuk audit log nanti.
- **Split file** hanya terjadi kalau file > sisa kapasitas 1 akun, berdasarkan alokasi kapasitas real, bukan ukuran tetap. Jangan sederhanakan ke "selalu split tiap N MB".
- Kalau menambah provider baru (OneDrive/Dropbox), ikuti pola `account_owner_type` (`institution`/`personal`) yang sudah dirancang di skema — prioritaskan akun institusi dulu saat alokasi upload.

## 3b. Design System (Referensi Resmi UI)
- Sumber kebenaran visual: `institutional_archive_aggregation_system/DESIGN.md` (export Google Stitch, folder `stitch_sisimpan_cloud_storage_aggregator.zip`) — palet "Sage & Teal", font Source Serif 4 (display) + Plus Jakarta Sans (UI/body) + JetBrains Mono (angka/data), radius 8px komponen standar / 16px kontainer besar.
- Mockup HTML per halaman (`sisimpan_dashboard_utama`, `sisimpan_login_register`, `sisimpan_management_storage`, `sisimpan_admin_panel`) adalah acuan layout, BUKAN kode final — konversi ke komponen React mengikuti konvensi §4, jangan port HTML mentah/vanilla JS-nya.
- Komponen signature **"Tangki Gabungan"** (segmented capacity bar) sudah diimplementasi di `components/dashboard/capacity-tank.tsx` dan sudah cukup selaras dengan DESIGN.md (palet teal bertingkat, pola diagonal untuk sisa kapasitas). Kalau bikin varian tangki baru (misal di admin panel), reuse pola yang sama, jangan reinvent.
- Ikon pakai `lucide-react` (sudah jadi dependency project), bukan Material Symbols seperti di mockup HTML asli.
- Token warna/font sudah didaftarkan sebagai CSS variable + Tailwind `@theme` di `app/globals.css` (`--color-primary`, `--color-surface-container-lowest`, `--font-display`, `--font-mono-data`, dst) — pakai token ini (`bg-primary`, `text-on-surface-variant`, `font-display`), jangan hardcode hex baru kecuali token yang relevan belum ada, baru tambahkan ke `globals.css` + `DESIGN.md`.

## 4. Konvensi Kode yang Sudah Berjalan (ikuti, jangan bikin pola baru)
- Logic storage/cloud murni ada di `lib/cloud/*.ts` (allocation, backoff, checksum, drive-upload, drive-download, google-drive, token-manager) — API route jadi tipis, panggil fungsi dari sini.
- Logic client-side upload/download pakai custom hook (`use-upload.ts`, `use-download.ts`), komponen UI tetap dumb/presentational.
- Search/filter logic terpusat di `lib/files/search.ts`, dipakai bareng oleh API route dan halaman `/files` (jangan duplikasi query di dua tempat).
- Semua tabel Supabase pakai Row Level Security aktif sejak awal — tabel baru wajib punya RLS policy, jangan skip "nanti aja".
- Migrasi SQL baru: file baru bernomor urut di `supabase/migrations/` (`0004_...sql`, dst), jangan edit migrasi lama yang sudah jalan.

## 5. Dokumentasi Progres
- Update `LOG.md` tiap task selesai (buat kalau belum ada).
- Update checklist `TODO.md`.
- Milestone baru → `SETUP_M{n}.md` baru dengan format sama seperti M1-M5 (Yang sudah dibuat / Cara Testing / Batasan yang disengaja / Kalau ada error).

## 6. Testing & Validasi
- Ikuti pola "Cara Testing" manual seperti di tiap `SETUP_M{n}.md` — tulis langkah testing yang sama levelnya untuk fitur baru.
- Jalankan `npm run lint` sebelum menandai task selesai (config eslint sudah ada).
- Untuk fitur yang menyentuh OAuth/Drive API, test manual dengan akun Google Drive asli (test user) — tidak ada mock di project ini saat ini.

## 7. Definisi "Selesai" untuk Task Baru
1. Kode dibuat sesuai spesifikasi di `03_Breakdown_Task_v2.md` / `TODO.md`
2. Mengikuti semua Batasan Keras di atas
3. Ada langkah testing manual yang ditulis (di `SETUP_M{n}.md` atau `LOG.md`)
4. `npm run lint` bersih
5. Checklist di `TODO.md` dicentang, `LOG.md` diupdate
