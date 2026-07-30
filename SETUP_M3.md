# SISIMPAN — Setup M3 (Upload Chunked + Split Multi-Akun)

Lanjutan dari M1+M2. Tidak ada environment variable baru atau migrasi SQL baru di M3 ini — semua kolom yang dibutuhkan sudah ada dari migrasi sebelumnya.

## Yang sudah dibuat di M3 ini

- `lib/cloud/allocation.ts` — server memutuskan file mau dipecah ke akun mana saja (prioritas akun institusi dulu, lalu sisa kapasitas terbesar dulu), dengan margin aman 5%
- `lib/cloud/checksum.ts` — hitung checksum SHA-256 whole-file DAN per-bagian sekaligus, cuma 1x baca file (pakai `js-sha256` versi incremental, bukan `crypto.subtle` biasa yang harus muat seluruh file di memori)
- `lib/cloud/drive-upload.ts` — resumable upload API Google Drive, jalan langsung dari browser (bukan lewat server kita), termasuk logic resume kalau PUT terputus di tengah jalan
- `lib/cloud/backoff.ts` — retry exponential backoff dipakai di semua panggilan ke Drive API
- `components/upload/use-upload.ts` — orkestrasi lengkap: plan → hash → buat metadata → upload tiap bagian → lapor selesai
- `components/upload/file-uploader.tsx` — UI drag & drop + progress bar
- Endpoint baru: `POST /api/storage/plan-upload`, `POST /api/storage/accounts/[id]/token`, `POST /api/files`, `GET /api/files`, `POST /api/files/[id]/chunks`
- Halaman `/files` — upload + daftar file dengan status (Mengupload/Siap/Sebagian Gagal/Gagal)

## Alur yang terjadi saat upload (biar paham cara ngetestnya)

1. Browser minta rencana split ke `/api/storage/plan-upload` — server balikan daftar akun + berapa besar bagian di tiap akun + access token per akun
2. Browser baca file sekali, hitung checksum whole-file + per-bagian
3. Browser buat baris `files` di DB (status `uploading`)
4. Untuk tiap bagian **satu per satu** (bukan paralel — sengaja, biar gampang di-retry dan tidak membanjiri Drive API sekaligus):
   - Mulai resumable session ke Google Drive pakai access token akun tsb
   - PUT bytes bagian itu langsung ke Drive
   - Lapor ke `/api/files/[id]/chunks` (simpan metadata + otomatis nambah `storage_used` akun itu)
5. Setelah semua bagian selesai dan tercatat = `chunk_count`, file otomatis ditandai `ready`

## Cara Testing

### 1. Test file kecil (1 akun cukup)

```bash
npm install   # ada dependency baru: js-sha256
npm run dev
```

1. Pastikan sudah connect minimal 1 akun Google Drive (dari M2)
2. Buka `/files`, upload file kecil (misal 5MB)
3. Perhatikan progress: "Menyusun rencana..." → "Menghitung checksum..." → "Mengupload..." → selesai
4. Cek di Google Drive kamu langsung (drive.google.com) — harus muncul file baru dengan nama yang sama
5. Refresh `/storage` — `storage_used` akun itu harus naik sesuai ukuran file

### 2. Test split multi-akun (bagian paling penting)

Supaya bisa test split beneran tanpa perlu upload file raksasa:
1. Di Supabase Table Editor, buka tabel `cloud_accounts`
2. Edit manual kolom `storage_limit` salah satu akun jadi kecil, misal `10000000` (10MB) dan `storage_used` jadi `9000000` (9MB) — jadi sisa kapasitasnya cuma ~1MB
3. Connect 1 akun lagi (akun Google kedua) supaya ada 2 akun aktif
4. Upload file yang lebih besar dari sisa kapasitas akun pertama (misal 5MB)
5. Harus kelihatan di UI: "Mengupload... (bagian 1/2)" lalu "(bagian 2/2)"
6. Cek di kedua akun Drive — file harusnya kepecah, sebagian di akun 1 sebagian di akun 2
7. Cek tabel `file_chunks` di Supabase — harus ada 2 baris untuk 1 `file_id`, dengan `cloud_account_id` berbeda

### 3. Test kapasitas tidak cukup

1. Set `storage_limit` = `storage_used` di SEMUA akun (sisa kapasitas 0)
2. Coba upload file apa saja
3. Harus muncul pesan error "Kapasitas gabungan tidak cukup..." — bukan crash atau hang

### 4. Test file gagal di tengah jalan

Cara paling gampang simulasi ini: putus koneksi internet sesaat setelah klik upload (sebelum selesai), lalu sambungkan lagi.
- Backoff akan retry otomatis beberapa kali
- Kalau tetap gagal setelah retry habis: status file harus jadi "Sebagian Gagal" atau "Gagal" di halaman `/files`, bukan nyangkut selamanya di "Mengupload"

## Batasan yang disengaja di M3 ini (belum masuk scope)

- **Upload sequential, bukan paralel** — kalau file displit ke 5 akun, upload jalan satu-satu, bukan 5 sekaligus. Ini lebih lambat tapi lebih aman dari rate limit. Bisa dioptimasi jadi paralel-terbatas (misal 2-3 sekaligus) nanti kalau perlu, tapi bukan prioritas MVP.
- **Resume upload cuma jalan dalam 1 sesi aktif** — kalau koneksi putus sesaat lalu nyambung lagi (masih di tab yang sama), otomatis lanjut dari titik terakhir. Tapi kalau BROWSER DITUTUP TOTAL di tengah upload besar, upload itu tidak otomatis lanjut saat dibuka lagi — harus upload ulang dari awal. File yang nyangkut di status `uploading` lebih dari 24 jam nanti dibersihkan cron (rencana M6, MON-001 dst). Ini limitation yang sudah didokumentasikan di `04_Analisis_Risiko_Teknis.md` poin 6.
- **Belum ada tombol download/delete file** di halaman `/files` — itu scope M4 (FILE-007, FILE-008).
- **Token access untuk upload berumur pendek (~1 jam)** — untuk file yang uploadnya makan waktu lebih dari itu (jaringan lambat + file sangat besar), ada fallback auto-refresh token kalau kena 401, tapi belum banyak ditest untuk kasus ekstrem.

## Kalau ada error

- **"Kapasitas gabungan tidak cukup"** padahal harusnya cukup → cek `storage_used`/`storage_limit` di tabel `cloud_accounts`, mungkin belum di-sync (klik "Sync Kuota" di `/storage`)
- **Upload macet di "Menyusun rencana..."** → cek console browser, biasanya karena belum ada akun cloud aktif (`status='active'`) sama sekali
- **File API Drive nolak dengan 401 terus-menerus** → coba putuskan dan connect ulang akun di `/storage`, kemungkinan refresh_token sudah tidak valid (akun di-revoke dari sisi Google)
