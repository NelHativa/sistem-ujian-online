# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Demo MVP Sistem Ujian Online SMAS Bina Taruna. Demo dijadwalkan **Sabtu, 28 November 2026**. Akun demo, jadwal sesi dummy, dan pemetaan skenario demo ada di `README.md`. Status kerja terkini, rencana, dan log antar sesi ada di `CONTEXT.md` (dimuat otomatis lewat baris di bawah). Perbarui `CONTEXT.md` di akhir sesi dengan `/handoff`.

@CONTEXT.md

## Perintah

```bash
npm install
cp .env.example .env                      # wajib sekali; .env tidak di-commit
npm run demo:reset                        # hapus data/ujian.db, prisma db push, seed. Jadwal relatif ke "sekarang"
npm run demo:reset -- --mulai 09:00       # jadwal relatif ke jam mulai demo (WIB, hari ini)
npm run dev                               # http://0.0.0.0:3000, bisa dibuka dari perangkat lain di LAN
npm run typecheck                         # tsc --noEmit
npm test                                  # vitest run (semua test di tests/)
npx vitest run tests/aturan.test.ts -t "PGK"   # satu test berdasarkan nama
npm run build && npm run start:https      # produksi lewat HTTPS :3443, butuh certs/cert.pem & certs/key.pem (mkcert)
npm run db:push                           # terapkan perubahan prisma/schema.prisma (juga menjalankan prisma generate)
```

- Tidak ada ESLint maupun Prettier. Pemeriksaan otomatisnya hanya `typecheck`, `test`, dan `build` (jalankan ketiganya lewat `/cek`). Ikuti gaya yang ada: kutip tunggal, titik koma, indentasi 2 spasi, baris panjang (~150 kolom) diperbolehkan.
- Matikan server sebelum `demo:reset`, karena perintah itu menghapus file SQLite yang sedang dibuka.
- Data dummy memakai jadwal relatif. Kalau sesi demo sudah lewat atau berantakan, jalankan `demo:reset` lagi. Semua data di DB ikut hilang.
- Proyek ini tidak memakai migrasi Prisma. Skema diterapkan dengan `db push` ke SQLite. `demo:reset` memakai `--skip-generate`, jadi setelah mengubah skema jalankan `npm run db:push` atau `npx prisma generate` agar tipe client ikut diperbarui.

## Arsitektur

Next.js 15 App Router + Prisma (SQLite, mode WAL) + Tailwind 3. Semua identifier, pesan, dan komentar memakai Bahasa Indonesia. Pertahankan konvensi ini. Komentar seperti `AUTH-06`, `UJI-09`, `WAKTU-02`, `SOAL-10`, `NILAI-05` merujuk ke kode kebutuhan di PRD Sistem Ujian Online v1.0 (lihat `docs/`). Saat menambah atau mengubah aturan, cantumkan kodenya.

### Pola halaman & API

- Halaman adalah server component yang langsung memanggil `prisma` (dari `@/lib/db`) dan memakai `export const dynamic = 'force-dynamic'`. Proyek ini tidak memakai server actions. Semua mutasi melewati route handler di `src/app/api/**` yang dipanggil `fetch` dari client component (`src/components/**`).
- `src/app/{guru,admin}/page.tsx` adalah halaman login. Halaman yang butuh login berada di route group `(app)/`, dan layout-nya memanggil `wajibGuru()`/`wajibAdmin()`. Siswa login di `/`, lalu masuk ke `/ujian` dan `/ujian/[sesiId]`.
- Otorisasi dan galat per peran:
  - Halaman: `wajibSiswa/wajibGuru/wajibAdmin()` (`src/lib/auth.ts`) melakukan redirect ke halaman login.
  - API guru/admin: `aksesPaket()` (`src/lib/guruApi.ts`), `aksesAdmin()` dan `aksesSesiAdmin()` (`src/lib/adminApi.ts`) melempar `GalatApi(status, pesan)`. Tangkap dengan `jawabGalatApi(e)`.
  - API ujian siswa: `konteksUjian(sesiId)` (`src/lib/ujianSiswa.ts`) melempar `GalatUjian`. Tangkap dengan `jawabGalat(e)`.
- Cakupan admin: `adminLogin()` mengembalikan `grupIds`. Admin `UTAMA` mencakup semua grup, sedangkan admin `GRUP` hanya grupnya sendiri. Setiap query admin harus dibatasi oleh `grupIds` (lihat `kelasIdsAdmin`, `aksesSesiAdmin`).

### Login & sesi

- Cookie dibedakan per peran (`sid_siswa`, `sid_guru`, `sid_admin`) dan menunjuk ke tabel `SesiLogin`. Sesi kedaluwarsa setelah 120 menit tidak aktif. Login wajib lolos captcha buatan server (`src/lib/captcha.ts`, tabel `Captcha`).
- Siswa hanya boleh punya **satu sesi aktif** (login kedua ditolak 409 sampai admin menekan Reset). Untuk guru/admin, login terbaru menonaktifkan sesi sebelumnya.
- Token ujian terikat ke sesi login: `PesertaSesi.tokenLoginId === sesiLogin.id`. Setelah login ulang, siswa harus memasukkan token lagi.

### Aturan waktu (inti sistem)

- `src/lib/waktu.ts` menentukan fase sesi dari jam server: `BELUM_MULAI → BERLANGSUNG → TOLERANSI_EDIT → TOLERANSI_KUMPUL → DITUTUP`. `bolehUbahJawaban()` dan `bolehKumpul()` adalah satu-satunya sumber keputusan, dan setiap route wajib memeriksanya di server.
- `konteksUjian()` menghitung `Langkah` siswa (`BELUM_MULAI | TOKEN | KONFIRMASI | KERJAKAN | SELESAI | TERTUTUP | BELUM_FINAL`). Halaman ujian (`AlurUjian` → `LayarUjian`) hanya menampilkan langkah yang dikirim server.
- Penjadwal: `src/instrumentation.ts` memanggil `mulaiPenjadwal()` (`src/lib/penutupan.ts`), yang menjalankan `sapuSesi()` setiap 5 detik di runtime Node. Penjadwal ini memaksa kumpul (`OTOMATIS`), menandai `TIDAK_HADIR`, dan menutup sesi setelah batas kumpul. Penjadwal dijaga lewat `globalThis` agar tidak terduplikasi saat HMR, dan diasumsikan hanya ada **satu proses server**.
- Toleransi disimpan di tabel `Pengaturan` (`getPengaturan()` di `src/lib/settings.ts`). `TOLERANSI_*_MENIT` di `.env` **hanya dibaca oleh seed**. Mengubah `.env` baru berpengaruh setelah `demo:reset`, atau ubah lewat menu Pengaturan Admin Utama.

### Klien ujian

- `src/components/ujian/pengelolaSimpan.ts` (kelas `PengelolaSimpan`): antrean jawaban dan peristiwa anti-kecurangan, disalin ke `localStorage` (`ujian-antrean-<pesertaId>`), dikirim dengan debounce dan dicoba ulang saat offline, plus heartbeat ke `/api/ujian/[sesiId]/detak`.
- `src/lib/jamServer.ts`: jam di perangkat memakai `performance.now()` yang disinkronkan dari `serverNow` di respons API, jadi mengubah jam HP tidak berpengaruh.
- Endpoint siswa ada di `src/app/api/ujian/[sesiId]/`: `GET` (state), `token`, `mulai`, `jawaban` (PUT, satu item atau `{items: [...]}` dari antrean offline), `peristiwa`, `detak`, `kumpul`.
- Kunci jawaban tidak pernah dikirim ke perangkat siswa (`soalUntukSiswa()`). Opsi PG/PGK diacak secara deterministik dengan `acakDeterministik(opsi, peserta.seed, soal.id)`, sehingga urutannya tetap sama setelah reload.

### Model data (`prisma/schema.prisma`)

- SQLite tidak punya enum atau tipe Json. Status disimpan sebagai `String`, dengan daftar nilainya di komentar skema (mis. `kehadiran: BELUM | HADIR | TERLAMBAT | TIDAK_HADIR`). Kolom JSON disimpan sebagai string: `Soal.gambar`, `Jawaban.isi` (opsiId, array opsiId, atau teks esai), `Nilai.poinEsai`, `LogAktivitas.data`. Baca `Jawaban.isi` dengan `parseIsi()`.
- `PesertaSesi` adalah pusat ujian per siswa: kehadiran, jam masuk/kumpul, `seed` pengacakan, jumlah pelanggaran, dan status sirine.
- Paket soal: `DRAF` → `FINAL`. Soal hanya bisa diubah saat Draf (409 bila Final), dan paket terkunci permanen setelah sesi pertama yang memakainya dimulai (`paketTerkunci()`). Validasi sebelum finalisasi ada di `validasiPaket()` (`src/lib/paket.ts`).
- Penilaian (`src/lib/penilaian.ts`): `hitungNilai()` menghasilkan nilai saran, dan `validasiNilaiAkhir()` hanya menerima bilangan bulat 0–100. Ekspor Excel ada di `src/lib/excel.ts`, dengan sheet sesuai Lampiran A PRD.

### Log aktivitas

Setiap aksi penting memanggil `catatLog({ kode, aktorTipe, ... })` (`src/lib/log.ts`). Kode log baru **harus** ditambahkan ke `LABEL_LOG` (dipakai lini masa dan Excel). Jika kode itu termasuk pelanggaran, tambahkan juga ke `KODE_PELANGGARAN`.

### Berkas & tampilan

- Gambar soal disimpan di `data/uploads/` (di-gitignore) dan disajikan oleh `/api/gambar/[nama]`. Nama file divalidasi dengan `namaAman()`. Seed menyalin aset contoh dari `prisma/aset/`.
- Demo harus bisa berjalan **tanpa internet**: font dipasang lokal lewat `@fontsource`, tanpa CDN atau layanan eksternal. Warna Tailwind `navy`/`emas`, dan kelas bersama (`kartu`, `btn`, `btn-primer`, `input`, `tabel`, `lencana`, `mode-ujian`) didefinisikan di `src/app/globals.css`.

## Batasan sebelum demo

- Jangan menjalankan `npm audit fix --force` atau upgrade versi mayor (Next 16, Prisma 7, Tailwind 4, TypeScript 7) sebelum demo selesai. Celah audit yang ada saat ini berisiko rendah untuk aplikasi ini (rinciannya di `CONTEXT.md`).
- Jangan menambah dependensi yang butuh internet saat runtime.

## Git

- `origin` adalah fork `rakaspecsyai/sistem-ujian-online`. `upstream` adalah repo asli `NelHativa/sistem-ujian-online`. Kerja dilakukan di branch `kolaborasi-natan`, lalu PR ke `upstream/main`. Sinkronkan dengan `git fetch upstream && git rebase upstream/main`.
- Pesan commit memakai Bahasa Indonesia, kalimat perintah (mis. "Tambah fitur ..."), dengan butir rincian bila perlu.
