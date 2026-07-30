# SISIMPAN — Analisis Risiko & Potensi Masalah
## Dokumen Pendukung untuk Tim Development

---

## Tujuan Dokumen

Dokumen ini melengkapi BRD/PRD dan Rencana Implementasi Teknis dengan daftar risiko konkret yang **kemungkinan besar muncul** saat SISIMPAN dibangun dan dijalankan, di luar risiko yang sudah tercatat di tabel risiko BRD. Setiap dev yang mengerjakan modul terkait wajib paham poin-poin ini sebelum implementasi, karena beberapa di antaranya berdampak ke keputusan arsitektur — bukan sekadar bug yang bisa diperbaiki belakangan.

Setiap risiko diberi tingkat urgensi:
- 🔴 **Kritis** — mempengaruhi kelayakan/legalitas proyek, harus ditangani sebelum rilis ke user sungguhan
- 🟡 **Sedang** — berdampak ke pengalaman user atau stabilitas, tapi ada workaround
- 🟢 **Rendah** — perlu diketahui, tapi kemungkinan terjadi kecil di skala institusi kecil

---

## 1. 🔴 OAuth Consent Screen — Status "Unverified App"

**Masalah:**
Selama aplikasi Google Cloud yang dipakai SISIMPAN belum lolos proses verifikasi Google, setiap user yang klik "Connect Google Drive" akan melihat layar peringatan besar bertuliskan *"Google hasn't verified this app"*. Ini menakutkan bagi user awam (guru/siswa) dan bisa bikin mereka takut lanjut.

**Dampak lebih serius:** selama status app masih **Testing** (belum verified), Google **membatasi maksimal 100 test user** yang bisa connect. Kalau target user institusi > 100 orang, fitur konek Drive akan berhenti berfungsi untuk user ke-101 dan seterusnya.

**Rekomendasi:**
- Submit app untuk verifikasi Google Cloud Console sejak awal development (proses ini gratis tapi bisa makan waktu beberapa minggu, jadi jangan ditunda sampai mendekati rilis).
- Syarat verifikasi: privacy policy publik, domain terverifikasi, video demo alur OAuth, penjelasan penggunaan tiap scope.
- Selama menunggu verifikasi, informasikan ke calon user institusi soal batas 100 akun dan warning "unverified" supaya tidak jadi kejutan.

**Cara Penyelesaian (Langkah Konkret):**
1. **Siapkan domain sendiri** (bukan localhost) — minimal subdomain gratis yang bisa di-attach ke Vercel, karena verifikasi Google mensyaratkan domain terverifikasi via Google Search Console.
2. **Buat halaman Privacy Policy & Terms of Service publik** (bisa halaman statis sederhana di `/privacy` dan `/terms`), wajib ada sebelum submit verifikasi.
3. Di **Google Cloud Console → APIs & Services → OAuth consent screen**:
   - Isi App Name, logo, support email, developer contact
   - Tambahkan link privacy policy & ToS
   - Pilih scope `drive.file` (scope ini termasuk kategori *sensitive scope*, bukan *restricted*, jadi proses verifikasinya lebih cepat dibanding scope `drive` full-access)
4. Klik **"Prepare for verification"** → isi form justifikasi kenapa app butuh scope tersebut (jelaskan: "app hanya mengelola file yang dibuat sendiri oleh user lewat aplikasi, untuk keperluan manajemen storage terpusat institusi")
5. **Rekam video demo** singkat (2-3 menit) yang menunjukkan alur: user klik connect → consent screen Google → berhasil terhubung → upload file lewat SISIMPAN. Upload video ini (unlisted YouTube link cukup) di form verifikasi.
6. Submit dan tunggu. Sambil menunggu (biasanya 2-6 minggu), tetap bisa jalan di mode **Testing** dengan menambahkan email calon user satu-satu di **Test users** (maks 100).
7. Kalau institusi < 100 user, verifikasi ini bisa **ditunda** dan cukup pakai mode Testing — cuma perlu tambah tiap email user secara manual di Console. Kalau > 100 user, verifikasi wajib dikejar dari awal project, bukan menjelang rilis.

---

## 2. 🔴 Risiko Terms of Service Google Drive

**Masalah:**
Google Drive versi personal/gratis ditujukan untuk pemakaian pribadi. Menjadikan kumpulan akun gratis sebagai "backend penyimpanan terpusat institusi" berpotensi terbaca sebagai pola penyalahgunaan oleh sistem deteksi otomatis Google (bulk API calls dari banyak akun berbeda, pola upload/download yang tidak biasa, dsb).

**Dampak:** akun yang di-flag bisa kena suspend sepihak oleh Google, kadang tanpa banyak jalur banding untuk akun personal.

**Rekomendasi:**
- Jangan treat ini sebagai "tidak masalah karena gratis" — ini trade-off yang harus disadari sejak awal, bukan sesuatu yang bisa "diperbaiki" lewat kode.
- Terapkan rate-limiting sisi aplikasi (jangan hajar API sekencang mungkin walau kuota masih ada) supaya pola penggunaan terlihat lebih wajar.
- Pertimbangkan disclaimer ke admin institusi soal risiko ini sebagai bagian keputusan bisnis, bukan cuma keputusan teknis dev.

**Cara Penyelesaian (Mitigasi Teknis + Kebijakan):**
1. **Batasi kecepatan request sendiri** di kode — jangan cuma andalkan Google yang menolak. Contoh: maksimal 5 request/detik per akun cloud, walau quota resmi mengizinkan lebih, supaya pola traffic terlihat seperti pemakaian manusia biasa, bukan bot/automasi masif.
2. **Sebar beban antar akun**, jangan semua chunk lewat 1 akun secara berurutan cepat — ini juga sudah sejalan dengan desain multi-account split yang sudah ada.
3. **Dokumentasikan sebagai kebijakan tertulis ke admin institusi** (bukan cuma dev): jelaskan bahwa storage ini memakai akun Drive gratis personal, ada risiko suspend sepihak dari Google, dan institusi disarankan **tidak** menyimpan satu-satunya salinan data penting di sana — perlu ada backup terpisah untuk data kritikal (misal rapor, ijazah, dokumen legal).
4. **Sediakan fitur export/backup berkala** (masuk ke Fase 3 "Export laporan" di BRD — perluas cakupannya jadi termasuk file, bukan cuma laporan) supaya kalau ada akun ke-suspend, institusi masih punya salinan lokal.
5. **Pantau status akun secara rutin** lewat cron health-check yang sudah direncanakan — kalau ada akun berstatus `expired`/`revoked` mendadak, itu sinyal dini kemungkinan kena flag Google, segera migrasikan chunk di akun itu ke akun lain.
6. Sebagai alternatif jangka panjang (di luar scope MVP): pertimbangkan opsi **Google Workspace for Education** (gratis untuk sekolah terverifikasi, dengan ToS yang memang mengizinkan pemakaian institusi) sebagai pengganti akun Drive personal — ini menghilangkan risiko ToS sepenuhnya kalau institusi memenuhi syarat.

---

## 3. 🟡 Ketergantungan pada Akun Pribadi Individu

**Masalah:**
Kalau storage pool dibangun dari akun Drive pribadi milik guru/staf (bukan akun institusi), maka:
- Staf resign/keluar → akses ke chunk file yang ada di akun itu bisa hilang
- Staf lupa password / akun kena suspend Google → sebagian file institusi ikut tidak bisa diakses
- Tidak ada kontrol terpusat admin atas akun-akun yang jadi tulang punggung storage

**Rekomendasi:**
- Prioritaskan pool akun institusi (yang dikontrol admin) untuk file penting/kritikal, bukan akun pribadi individu.
- Kalau tetap pakai akun pribadi staf, buat kebijakan offboarding: sebelum staf keluar, chunk file di akunnya di-migrate dulu ke akun lain.
- Dashboard admin idealnya menampilkan "chunk yang bergantung pada akun X" supaya risiko ini terlihat, bukan tersembunyi.

**Cara Penyelesaian (Teknis):**
1. Tambah kolom `account_owner_type` (`institution` / `personal`) di tabel `cloud_accounts` sejak awal skema, supaya bisa dibedakan dan diprioritaskan saat alokasi chunk.
2. Saat memilih akun tujuan upload (logic "Storage Pool" di rencana teknis), **prioritaskan akun bertipe `institution` dulu**, baru fallback ke akun personal kalau kapasitas institusi penuh.
3. Buat endpoint admin `POST /api/storage/accounts/:id/migrate` yang memindahkan semua chunk dari 1 akun ke akun lain (download dari akun lama → upload ke akun baru → update `remote_file_id` di DB → hapus dari akun lama). Ini dipakai saat proses offboarding staf.
4. Tambah halaman admin sederhana yang menampilkan "akun mana yang menyimpan berapa file penting", supaya sebelum staf resign, admin bisa lihat dan jalankan migrasi lebih dulu.

---

## 4. 🟡 Concurrent Upload Saat Jam Sibuk

**Masalah:**
Momen seperti awal semester (banyak guru upload materi bersamaan) berpotensi memicu banyak request ke Google Drive API dalam waktu singkat, berisiko kena error rate-limit (403/429).

**Rekomendasi:**
- Implementasi retry dengan exponential backoff di client (sudah direncanakan di tabel risiko BRD — pastikan benar-benar diimplementasi, bukan cuma tercatat di dokumen).
- Test beban (load test) dengan simulasi banyak user upload bersamaan sebelum rilis ke institusi, bukan baru ketahuan pas hari-H.
- UX: tampilkan status antrian yang jelas ke user ("sedang menunggu giliran") supaya tidak terlihat seperti aplikasi hang.

**Cara Penyelesaian (Teknis):**
1. Implementasi exponential backoff di helper upload client: kalau dapat 403/429, tunggu (misal 1s, 2s, 4s, 8s... maks ~64s) sebelum retry, bukan retry langsung berulang-ulang.
2. Buat fungsi util `lib/cloud/backoff.ts` yang dipakai bersama oleh semua pemanggilan Google Drive API (upload, download, quota check) — jangan implementasi backoff terpisah-pisah tiap fitur.
3. Untuk load testing sebelum rilis: pakai akun Google Drive dummy/testing, simulasikan 10-20 upload paralel pakai script sederhana (misal k6 atau Artillery) untuk lihat di titik mana mulai muncul error 429.
4. Tambah indikator UI status per-file: `queued` → `uploading` → `retrying (percobaan ke-2)` → `done`/`failed`, supaya user tahu ini masih proses, bukan macet.

---

## 5. 🟡 Batasan Free Tier Supabase & Vercel Bukan Tanpa Syarat

| Batasan | Detail | Dampak |
|---|---|---|
| Supabase auto-pause | Project Supabase free otomatis pause kalau tidak ada aktivitas ~1 minggu | Saat institusi libur panjang (libur semester), project bisa "tidur" dan perlu di-*wake* manual sebelum dipakai lagi |
| Supabase 500MB DB | Cukup untuk metadata ribuan file (~1KB/file) | Kalau `activity_logs` tidak pernah dibersihkan, bisa lebih cepat penuh dari perkiraan |
| Vercel bandwidth 100GB/bulan | Berlaku untuk traffic yang lewat Vercel function | Risiko rendah karena desain upload/download direct ke Drive, tapi tetap perlu dimonitor kalau ada fitur proxy tambahan ke depan |

**Rekomendasi:** buat job cleanup berkala untuk `activity_logs` lama, dan pasang monitoring/alert sebelum limit tercapai — bukan menunggu error muncul di produksi.

**Cara Penyelesaian (Teknis):**
1. Tambah cron job tambahan (`/api/cron/cleanup-logs`, jadwal mingguan) yang menghapus `activity_logs` lebih tua dari misal 90 hari, atau mengarsipkannya ke tabel terpisah kalau perlu histori jangka panjang.
2. Untuk masalah auto-pause Supabase: buat **cron job "ping" ringan** yang jalan tiap beberapa hari (misal lewat Vercel Cron memanggil endpoint yang query sederhana ke Supabase) supaya project tetap dianggap aktif dan tidak di-pause otomatis saat libur panjang. Ini solusi gratis dan sederhana.
3. Pasang query sederhana di dashboard admin yang menampilkan estimasi pemakaian DB (`SELECT pg_database_size(current_database())`) supaya admin bisa lihat tren pemakaian sebelum mendekati 500MB, bukan baru sadar setelah error muncul.

---

## 6. 🟢 Resumable Upload Session Punya Masa Berlaku

**Masalah:**
Google Drive Resumable Upload session (yang dipakai untuk fitur resume) tidak berlaku selamanya — kalau user berhenti upload terlalu lama (bukan sekadar tutup tab sebentar, tapi berhari-hari), session bisa kedaluwarsa dan harus mulai ulang dari awal.

**Rekomendasi:**
- Buat cron job pembersih untuk file yang macet di status `uploading` melewati batas waktu wajar (misal >24 jam), supaya tidak menumpuk sebagai "sampah" di database.
- Beri notifikasi ke user kalau upload mereka expired dan perlu diulang, jangan biarkan tampil sebagai "sedang proses" selamanya.

**Cara Penyelesaian (Teknis):**
1. Tambah kolom `upload_started_at` di tabel `files`/`file_chunks`.
2. Cron job tambahan (`/api/cron/cleanup-stale-uploads`, jalan harian) yang query semua file berstatus `uploading` dengan `upload_started_at` lebih dari 24 jam lalu → ubah status jadi `failed` dan hapus baris chunk yang tidak lengkap.
3. Trigger notifikasi (email via Supabase Auth atau Telegram bot yang sudah direncanakan) ke user pemilik file yang gagal, supaya mereka tahu harus upload ulang.

---

## 7. 🟢 Konsistensi Data Saat Sebagian Chunk Gagal

**Masalah:**
Kalau dari 5 bagian file yang harus di-split, 3 berhasil upload dan 2 gagal (lalu user menutup browser sebelum retry), file akan tersangkut dalam kondisi "setengah jadi" di database.

**Rekomendasi:**
- Definisikan status file secara eksplisit di skema: `uploading` → `partial_failed` → `ready` / `failed`, jangan cuma `uploading`/`ready`.
- Sediakan endpoint/admin tool untuk melihat dan membersihkan file berstatus `partial_failed` yang macet lama.
- Chunk yang sudah kadung ke-upload ke Drive tapi filenya gagal total sebaiknya dihapus otomatis (cron cleanup) supaya tidak jadi sampah tak terlacak di akun Drive.

**Cara Penyelesaian (Teknis):**
1. Update enum status di kolom `files.status`: `uploading` / `partial_failed` / `ready` / `failed` / `deleted` (tambahkan `partial_failed` yang belum ada di skema awal).
2. Saat browser melapor progres per-chunk (endpoint `POST /api/files/[id]/chunks`), kalau ada chunk yang gagal setelah retry maksimal, API set status file jadi `partial_failed`, bukan biarkan `uploading` selamanya.
3. Job cleanup (bisa digabung dengan cron di poin #6) yang menangani file `partial_failed`/`failed` lebih tua dari batas waktu tertentu: panggil Google Drive API untuk **hapus chunk yang sudah terlanjur ke-upload** (`DELETE files/{fileId}` di Drive API), baru hapus baris terkait di `file_chunks` dan `files`.
4. Beri tombol "Coba Upload Ulang" di UI untuk file berstatus `partial_failed`, yang cukup upload ulang bagian yang gagal saja (bukan dari nol), memanfaatkan checksum yang sudah tersimpan untuk verifikasi bagian mana yang sudah valid.

---

## Prioritas Penanganan

Urutan yang disarankan untuk ditangani lebih dulu, karena berdampak ke kelayakan proyek secara keseluruhan (bukan sekadar bug):

1. 🔴 **OAuth verification & limit 100 test user** — tentukan status ini sebelum onboarding user > 100 orang
2. 🔴 **Risiko ToS Google Drive** — perlu keputusan sadar dari pemilik proyek/institusi, bukan cuma keputusan dev
3. 🟡 Sisanya bisa ditangani bertahap selama development, masuk ke task breakdown masing-masing epic terkait
