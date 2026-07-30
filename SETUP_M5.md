# SISIMPAN — Setup M5 (Search & Delete File)

Lanjutan dari M1-M4. Tidak ada migrasi SQL baru dan tidak ada environment variable baru di bagian ini.

## Yang sudah dibuat

**Search & Filter:**
- `lib/files/search.ts` — logic query search (dipakai bareng oleh API dan halaman, biar tidak duplikat)
- `GET /api/files/search?q=&category=&sortBy=&sortDir=` — endpoint API (kalau nanti butuh dari client lain, misal mobile app)
- Halaman `/files` sekarang baca dari URL query params langsung (`?q=laporan&category=document&sortBy=name&sortDir=asc`), jadi search bisa di-bookmark/share link-nya
- `components/files/file-search-bar.tsx` — input cari nama, dropdown kategori (Gambar/Video/Audio/Dokumen/Lainnya), dropdown sort

**Delete File (FILE-008):**
- `DELETE /api/files/[id]` — hapus semua bagian file di Google Drive dulu (tiap akun), baru tandai file `deleted` di database (soft delete, bukan hard delete — supaya jejaknya masih ada buat audit log nanti)
- Kapasitas `storage_used` akun otomatis dikurangi sesuai ukuran bagian yang dihapus
- Tombol **Hapus** di halaman `/files`, dengan konfirmasi sebelum eksekusi

## Cara Testing

### 1. Search by nama

1. Upload beberapa file dengan nama berbeda (`laporan-q1.pdf`, `foto-acara.jpg`, `rekap.xlsx`)
2. Di halaman `/files`, ketik "laporan" di search box, Enter
3. Cuma `laporan-q1.pdf` yang harus muncul

### 2. Filter kategori

1. Pilih dropdown "Dokumen" → cuma file PDF/Word/Excel yang muncul
2. Pilih "Gambar" → cuma file JPG/PNG yang muncul
3. Kombinasikan dengan search nama — keduanya harus jalan bareng (AND, bukan OR)

### 3. Sort

1. Pilih "Ukuran Terbesar" → file paling besar harus di atas
2. Pilih "Nama (A-Z)" → urutan alfabetis

### 4. Delete file 1 akun

1. Klik **Hapus** di file yang chunk_count=1 (cuma di 1 akun)
2. Konfirmasi
3. Cek di Google Drive akun tsb — file harus hilang beneran dari Drive, bukan cuma dari daftar SISIMPAN
4. Cek `/storage` — `storage_used` akun itu harus turun sesuai ukuran file yang dihapus

### 5. Delete file yang displit ke multi-akun

1. Hapus file yang chunk_count > 1 (hasil split M3)
2. Cek KEDUA/SEMUA akun terkait di Google Drive — semua bagian harus hilang, bukan cuma sebagian
3. Cek `storage_used` di SEMUA akun terkait — harus turun masing-masing

### 5. Test file tidak lagi muncul di list setelah dihapus

Setelah delete, file itu tidak boleh muncul lagi di `/files` (karena difilter `status != deleted`), tapi barisnya masih ada di tabel Supabase (soft delete) kalau kamu cek langsung lewat Table Editor — itu memang disengaja.

## Batasan yang disengaja

- **Search cuma di kolom nama** — belum full-text search dalam isi file (memang di luar scope, Google Drive/SISIMPAN tidak baca isi file)
- **Kategori "Dokumen" pakai daftar mime-type tetap** (PDF, Word, Excel, PowerPoint, txt, csv) — kalau ada tipe file lain yang menurutmu harusnya masuk kategori ini, tinggal tambahkan ke `DOCUMENT_MIME_TYPES` di `lib/files/search.ts`
- **Delete tidak dibatalkan (undo)** — soft delete di database iya (baris masih ada), tapi bytes yang sudah dihapus dari Google Drive TIDAK BISA dikembalikan. Konfirmasi sebelum hapus sudah ada, tapi tidak ada "restore dari trash"
- **Kalau akun cloud sudah revoked/expired saat file dihapus** → bagian file di akun itu tidak akan berhasil dihapus dari Drive (dapat warning di UI), tapi file tetap ditandai deleted di SISIMPAN. Bytes yang "nyangkut" di Drive itu jadi tanggung jawab manual (hapus langsung dari drive.google.com kalau perlu)

## Kalau ada error

- **Search tidak menemukan file yang jelas-jelas ada** → cek ejaan, search pakai `ilike` (case-insensitive tapi harus exact substring match)
- **Delete gagal dengan pesan warning** → cek console server, biasanya karena `ensureValidAccessToken` gagal (akun sudah revoked) — file tetap terhapus dari SISIMPAN, tapi bytes di Drive akun itu perlu dibersihkan manual
