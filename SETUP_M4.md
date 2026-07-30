# SISIMPAN — Setup M4 (Download + Share Link + UI Polish)

Lanjutan dari M1+M2+M3. Ada 1 migrasi SQL tambahan, tidak ada environment variable baru.

## Yang sudah dibuat di M4 ini

**Download:**
- `lib/cloud/drive-download.ts` — download bytes langsung dari Drive (browser → Drive, prinsip yang sama dengan upload), gabungkan jadi 1 file, picu "Save As" browser
- `GET /api/files/[id]/download` — manifest download untuk file MILIK SENDIRI (butuh login)
- `components/download/use-download.ts` — hook orkestrasi download

**Share Link:**
- Migrasi `0003_m4_share.sql` — kolom `share_password_hash`, `share_expires_at` (kolom `share_token` sendiri sudah ada dari M1)
- `POST /api/files/[id]/share` — generate link (pilih masa berlaku + password opsional), `DELETE` untuk cabut
- `GET /api/share/[token]` dan `POST /api/share/[token]/download` — endpoint PUBLIK (tanpa login), sengaja pakai service role key + filter eksplisit di kode (lihat catatan keamanan di file migrasi kenapa ini PENTING, bukan sekadar gaya penulisan)
- Halaman publik `/share/[token]` — bisa diakses siapa saja, tidak kena middleware auth guard

**UI Polish:**
- Komponen `CapacityTank` (`components/dashboard/capacity-tank.tsx`) — elemen signature "Tangki Gabungan" dari desain Stitch, bar kapasitas tersegmentasi per akun cloud
- Sidebar pakai icon (`lucide-react`, sudah terinstall dari M1) dan warna teal konsisten dengan design system Stitch (`#2F6F62` dkk), bukan generic gray/green/red lagi

## Langkah Setup

### 1. Jalankan migrasi tambahan

Di Supabase SQL Editor, jalankan isi `supabase/migrations/0003_m4_share.sql`.

### 2. Jalankan seperti biasa

```bash
npm install
npm run dev
```

## Cara Testing

### 1. Download file milik sendiri

1. Buka `/files`, pastikan ada file berstatus "Siap" (hasil upload M3)
2. Klik tombol **Download**
3. Kalau file itu dulu displit ke >1 akun, harus kelihatan progress "Download 1/2", "Download 2/2"
4. File yang ke-download harus bisa dibuka normal dan isinya sama persis dengan aslinya (coba buka filenya)

### 2. Share link tanpa password

1. Klik tombol **Share** di salah satu file
2. Pilih masa berlaku (default 7 hari), biarkan password kosong
3. Klik **Buat Link** → link muncul, klik **Salin**
4. Buka link itu di **tab incognito** (simulasikan orang lain yang belum login)
5. Harus muncul halaman "File Dibagikan" dengan nama & ukuran file, tombol **Download File**
6. Klik download → harus berhasil tanpa perlu login sama sekali

### 3. Share link dengan password

1. Share file lain, isi password (misal `rahasia123`)
2. Buka link di incognito → harus muncul field password
3. Coba masukkan password salah dulu → harus muncul pesan "Password salah"
4. Masukkan password benar → download harus jalan

### 4. Share link kedaluwarsa

1. Share file dengan masa berlaku **1 hari**
2. Di Supabase Table Editor, edit manual `share_expires_at` file itu jadi tanggal kemarin
3. Buka link share-nya → harus muncul "Link ini sudah kedaluwarsa", bukan malah bisa download

### 5. Cabut share link

Belum ada tombol UI untuk ini di halaman `/files` (baru endpoint API-nya: `DELETE /api/files/[id]/share`). Test manual dulu lewat browser devtools/Postman kalau mau, atau tunggu ditambahkan ke UI kalau memang dibutuhkan buat MVP.

### 6. Cek Dashboard sudah pakai Tangki Gabungan

Buka `/dashboard` — kapasitas kalau ada >1 akun terkoneksi harus kelihatan sebagai bar tersegmentasi dengan warna teal berbeda-beda per akun, bukan cuma progress bar polos 1 warna.

## Batasan yang disengaja (belum masuk scope M4)

- **Tidak ada tombol "Cabut Share Link" di UI** — endpoint API-nya sudah ada (`DELETE /api/files/[id]/share`), tinggal tambah tombol kalau perlu
- **Tidak ada rate-limiting khusus di endpoint publik `/api/share/[token]/download`** — orang bisa coba password berkali-kali tanpa dibatasi. Untuk MVP low-traffic ini risikonya kecil, tapi kalau file sensitif, pertimbangkan tambah rate-limit sederhana nanti
- **Delete file (FILE-008)** belum dibuat — file yang salah upload masih harus dihapus manual lewat Supabase Table Editor + Google Drive langsung untuk sekarang
- **UI Polish belum menyentuh Admin panel** — karena backend-nya memang belum ada (sudah dibahas sebelumnya), fokus polish di M4 ini cuma Dashboard, Storage, Files, Login/Register

## Kalau ada error

- **Download stuck di "Menyiapkan..."** → cek console browser, biasanya karena file belum berstatus `ready` (masih ada chunk yang belum selesai)
- **Link share "tidak ditemukan" padahal baru dibuat** → pastikan migrasi `0003_m4_share.sql` sudah dijalankan (kolom `share_password_hash`/`share_expires_at` harus ada)
- **File hasil download rusak/tidak bisa dibuka** → kemungkinan checksum per-bagian saat upload dulu ada yang salah; cek tabel `file_chunks`, urutan `chunk_index` harus 0,1,2,... berurutan tanpa lompat
