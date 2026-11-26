# CONTEXT.md

Catatan kerja yang hidup untuk melanjutkan proyek antar sesi Claude Code dan antar anggota tim. Panduan teknis ada di `CLAUDE.md`, sedangkan akun demo dan skenario ada di `README.md`. Perbarui file ini di akhir setiap sesi dengan `/handoff`.

## Fokus saat ini

**Persiapan demo Sabtu, 28 November 2026.** Prioritasnya stabilitas: perbaikan bug dan latihan skenario demo (segmen 2–8 di README). Fitur baru dan upgrade versi mayor ditunda sampai demo selesai.

## Status terkini

_Terakhir diperbarui: 2026-11-26_

- Branch `kolaborasi-natan` dibuat dari `main`. Sebelum commit dokumentasi ini, semua ref sama di `09e164a`: `main`, `origin/main`, `upstream/main`, dan tag `v1.1-demo`.
- Branch `kolaborasi-natan` belum di-push ke `origin` dan belum punya upstream tracking.
- Hasil pemeriksaan pada 26 Nov: `npm run typecheck` lolos, `npm test` lolos 7/7, dan `npm run build` berhasil.
- Laptop ini belum punya `.env` maupun `data/ujian.db`. Sebelum `npm run dev`, jalankan dulu `cp .env.example .env && npm run demo:reset`.
- `certs/` masih kosong. Sertifikat mkcert belum dibuat untuk mode HTTPS demo.

### Kondisi npm (diperiksa 26 Nov)

- `npm audit` melaporkan 8 celah (5 high, 3 moderate). Semuanya transitif lewat `next` (postcss), `prisma` (effect, deepmerge-ts, @prisma/config), dan `exceljs` (uuid). Celah-celah itu hanya terpakai saat build atau di CLI, jadi risikonya rendah untuk aplikasi ini. Perbaikannya butuh upgrade mayor, jadi **ditunda sampai setelah demo**.
- Ada dua paket extraneous (`@img/sharp-wasm32`, `@emnapi/runtime`) yang tidak berbahaya dan bisa dibersihkan dengan `npm prune`.
- Versi npm lokal 9.2.0, sehingga field `allowScripts` di `package.json` kemungkinan diabaikan. Pertimbangkan `npm i -g npm@10`.

## Checklist menuju demo

Disusun dari README. Centang setelah dilakukan.

- [ ] `cp .env.example .env`, lalu cek `ADMIN_PASSWORD` dan `TOLERANSI_KUMPUL_MENIT=3`
- [ ] Buat sertifikat dengan `mkcert` untuk `localhost` dan IP laptop server, simpan di `certs/cert.pem` dan `certs/key.pem`
- [ ] Pasang root CA mkcert (`mkcert -CAROOT`) di setiap HP demo
- [ ] `npm run build && npm run start:https`, lalu buka `https://<ip-laptop>:3443` dari HP dan pastikan Wake Lock jalan
- [ ] Gladi lengkap segmen 2–8 **paling lambat H-1 (Jumat, 27 Nov)**
- [ ] Hari demo: matikan server, jalankan `npm run demo:reset -- --mulai <jam mulai demo>`, lalu nyalakan lagi
- [ ] Siapkan `contoh-gambar/penampang-daun.png` untuk diunggah guru di segmen 2

## Keputusan & batasan

- Tidak ada upgrade versi mayor dan tidak ada `npm audit fix --force` sebelum demo.
- Demo harus berjalan tanpa internet, jadi tidak boleh ada dependensi atau CDN eksternal.
- Dokumentasi agen (`CLAUDE.md`, `CONTEXT.md`, `.claude/`, `docs/`) di-commit ke `kolaborasi-natan` agar ikut terbagi lewat PR.

## Pertanyaan terbuka

- File PRD v1.0 dan Dokumen MVP Demo belum ada di repo. Simpan di `docs/` (lihat `docs/README.md`) agar arti kode kebutuhan (AUTH-01, UJI-09, dst.) bisa dicek.

## Glosarium

| Istilah di kode | Arti |
|---|---|
| Paket soal (`PaketSoal`) | Kumpulan soal satu mapel/tingkat, dibuat guru. Status `DRAF` atau `FINAL` |
| Tipe soal `PG`/`PGK`/`BS`/`ESAI` | Pilihan ganda, pilihan ganda kompleks (lebih dari satu kunci), Benar/Salah, esai |
| Bobot, hitungan | Poin soal; `hitungan` menandai soal yang langkahnya dikerjakan siswa di kertas, sementara jawaban akhirnya ditulis di sistem |
| Sesi ujian (`SesiUjian`) | Jadwal pelaksanaan satu paket untuk satu atau beberapa kelas, dengan token 6 digit. Tipe `REGULER` atau `SUSULAN` |
| Susulan | Sesi ulang untuk siswa yang Tidak hadir, memakai paket yang sama (`sesiIndukId`) |
| Peserta (`PesertaSesi`) | Satu siswa dalam satu sesi |
| Kehadiran | `BELUM`, `HADIR`, `TERLAMBAT` (masuk lewat `batasTerlambatMenit`), `TIDAK_HADIR` |
| Kumpul, `caraKumpul` | Submit jawaban: `MANUAL` (siswa), `OTOMATIS` (penjadwal server), `PAKSA_ADMIN` |
| Toleransi edit / kumpul | Jeda setelah jam selesai: jawaban masih bisa diubah (edit), lalu hanya bisa dikumpulkan (kumpul) |
| Ragu | Tanda "ragu-ragu" pada jawaban. Tidak dicatat di log |
| Pelanggaran, sirine | Keluar tab, PrintScreen, keluar layar penuh. Pelanggaran ke-3 membunyikan sirine dan memberi notifikasi di dashboard |
| Grup kelas / angkatan | Pengelompokan kelas (mis. Angkatan XI) yang menjadi cakupan Admin Grup |
| Admin Utama / Admin Grup | `UTAMA` mengelola semua grup dan Pengaturan; `GRUP` hanya grupnya |
| Penugasan | Relasi guru, mapel, dan kelas yang diajarnya |
| Pantau | Dashboard pemantauan sesi untuk admin (polling 5 detik) |
| `Galat*`, `wajib*`, `akses*`, `sapu*` | Error, guard halaman (redirect), guard API, penyapuan terjadwal |

## Log sesi

Entri terbaru di atas. Isi setiap entri: apa yang dikerjakan, apa yang belum selesai, dan langkah berikutnya.

### 2026-11-26: Orientasi & dokumentasi agen

- Menganalisis struktur proyek, kondisi git (fork dan upstream sinkron), dan kondisi npm (lihat bagian status).
- Menambahkan `CLAUDE.md`, `CONTEXT.md`, `.claude/settings.json` (izin perintah verifikasi), slash command `/cek` dan `/handoff`, serta `docs/README.md`.
- **Berikutnya:** buat `.env` dan DB lokal, siapkan sertifikat HTTPS, lalu jalankan gladi segmen 2–8 sesuai checklist di atas.
