# CONTEXT.md

Catatan kerja yang hidup untuk melanjutkan proyek antar sesi Claude Code dan antar anggota tim. Panduan teknis ada di `CLAUDE.md`, sedangkan akun demo dan skenario ada di `README.md`. Perbarui file ini di akhir setiap sesi dengan `/handoff`.

## Fokus saat ini

**Persiapan demo Sabtu, 28 November 2026.** Prioritasnya stabilitas: perbaikan bug dan latihan skenario demo (segmen 2–8 di README). Fitur baru dan upgrade versi mayor ditunda sampai demo selesai.

## Status terkini

_Terakhir diperbarui: 2026-11-26 (sore)_

**Git**
- Branch `kolaborasi-natan` di `7ae8829` (commit dokumentasi agen) sudah di-push dan melacak `origin/kolaborasi-natan`. PR ke `upstream/main` belum dicek atau dibuat.
- `main`, `origin/main`, dan `upstream/main` (pada fetch terakhir, 26 Nov), serta tag `v1.1-demo`, masih di `09e164a`.
- `CONTEXT.md` punya perubahan yang belum di-commit (update sesi ini).

**Lingkungan lokal (laptop WSL Ubuntu-26.04)**
- Pemeriksaan 26 Nov: `typecheck` lolos, `test` lolos 7/7, dan `build` berhasil (build terakhir sekitar 16:45).
- `.env` (isi sama dengan `.env.example`) dan `data/ujian.db` dibuat 26 Nov sekitar 13:48. Jadwal dummy relatif ke jam itu, jadi **sesi Sejarah sudah lewat**. Jalankan `demo:reset` sebelum gladi, dan matikan server dulu.
- Server `npm run start:https` sedang berjalan di terminal pengguna (port 3443), tidak dikelola Claude.

**HTTPS & jaringan**
- Sertifikat mkcert 1.4.4 (dipasang lewat apt) untuk `localhost`, `127.0.0.1`, dan `192.168.18.100`. Lokasinya `certs/cert.pem` dan `certs/key.pem` (di-gitignore), berlaku sampai Feb 2029. Root CA: `~/.local/share/mkcert/rootCA.pem` (di Windows: `\\wsl.localhost\Ubuntu-26.04\home\asus\.local\share\mkcert\rootCA.pem`), berlaku sampai 2036. **Jangan bagikan `rootCA-key.pem`.**
- `https://192.168.18.100:3443` sudah terbukti bisa dibuka dari laptop dan dari HP. Di HP, alamat harus diketik lengkap dengan `https://`.
- WSL memakai `networkingMode=Mirrored`, jadi IP LAN Windows sama dengan IP WSL. Wi-Fi laptop: "Ramu Saji Office 5G 2", profil Windows **Public**.
- Firewall Hyper-V untuk WSL memblokir semua koneksi masuk secara default (`DefaultInboundAction: Block`). Inilah penyebab HP awalnya gagal terhubung. Solusinya aturan `WSL-Ujian-SMAS` (inbound TCP 3000 dan 3443), yang sudah dipasang dan diverifikasi. Kalau aturannya hilang, buat ulang di PowerShell Admin: `New-NetFirewallHyperVRule -Name "WSL-Ujian-SMAS" -DisplayName "Ujian SMAS (3000, 3443)" -Direction Inbound -VMCreatorId '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -Protocol TCP -LocalPorts 3000,3443`.
- Kalau IP berubah (misalnya Wi-Fi lokasi demo berbeda): `mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 127.0.0.1 <IP-baru>`, lalu restart `start:https`. Build ulang tidak diperlukan, dan CA tetap sama, jadi HP tidak perlu dipasangi CA lagi.

### Kondisi npm (diperiksa 26 Nov)

- `npm audit` melaporkan 8 celah (5 high, 3 moderate). Semuanya transitif lewat `next` (postcss), `prisma` (effect, deepmerge-ts, @prisma/config), dan `exceljs` (uuid). Celah-celah itu hanya terpakai saat build atau di CLI, jadi risikonya rendah untuk aplikasi ini. Perbaikannya butuh upgrade mayor, jadi **ditunda sampai setelah demo**.
- Ada dua paket extraneous (`@img/sharp-wasm32`, `@emnapi/runtime`) yang tidak berbahaya dan bisa dibersihkan dengan `npm prune`.
- Versi npm lokal 9.2.0, sehingga field `allowScripts` di `package.json` kemungkinan diabaikan. Pertimbangkan `npm i -g npm@10`.

## Checklist menuju demo

Disusun dari README. Centang setelah dilakukan.

- [x] `cp .env.example .env`, lalu cek `ADMIN_PASSWORD` dan `TOLERANSI_KUMPUL_MENIT=3`
- [x] Pasang `mkcert` di WSL
- [x] Buat sertifikat dengan `mkcert` untuk `localhost` dan IP laptop server, simpan di `certs/cert.pem` dan `certs/key.pem`
- [ ] Impor root CA ke Windows (Trusted Root Certification Authorities) agar browser laptop memercayai sertifikat
- [ ] Pasang root CA mkcert (`mkcert -CAROOT`) di setiap HP demo
- [x] `npm run build && npm run start:https` berjalan dan sudah diverifikasi dari laptop serta HP
- [x] Buka port 3000 dan 3443 di firewall Hyper-V (aturan `WSL-Ujian-SMAS`)
- [x] HP bisa membuka `https://192.168.18.100:3443`
- [ ] Pastikan Wake Lock jalan di HP: setelah CA terpasang, layar tetap menyala selama ujian, dan log siswa tidak mencatat "Layar tetap menyala tidak tersedia"
- [ ] Gladi lengkap segmen 2–8 **paling lambat H-1 (Jumat, 27 Nov)**
- [ ] Hari demo: matikan server, jalankan `npm run demo:reset -- --mulai <jam mulai demo>`, lalu nyalakan lagi
- [ ] Siapkan `contoh-gambar/penampang-daun.png` untuk diunggah guru di segmen 2

## Keputusan & batasan

- Demo memakai **HTTPS** (`npm run start:https` + mkcert), tidak memakai HTTP biasa. Tanpa HTTPS, Wake Lock di HP tidak jalan. Layar HP yang mati sendiri dicatat sebagai pelanggaran "keluar tab", sehingga siswa bisa kena pelanggaran palsu dan sirine. Diputuskan 26 Nov.
- Tidak ada upgrade versi mayor dan tidak ada `npm audit fix --force` sebelum demo.
- Demo harus berjalan tanpa internet, jadi tidak boleh ada dependensi atau CDN eksternal.
- Dokumentasi agen (`CLAUDE.md`, `CONTEXT.md`, `.claude/`, `docs/`) di-commit ke `kolaborasi-natan` agar ikut terbagi lewat PR.
- Claude tidak bisa mengunduh atau memasang binary sendiri, karena ditolak sistem izin. Pemasangan alat (apt dan sejenisnya) serta perintah yang butuh hak Administrator Windows dijalankan oleh pengguna, misalnya lewat `! <perintah>` atau PowerShell Admin.

## Pertanyaan terbuka

- File PRD v1.0 dan Dokumen MVP Demo belum ada di repo. Simpan di `docs/` (lihat `docs/README.md`) agar arti kode kebutuhan (AUTH-01, UJI-09, dst.) bisa dicek.
- Apakah demo memakai Wi-Fi yang sama ("Ramu Saji Office 5G 2")? Kalau berbeda: buat ulang sertifikat untuk IP baru, lalu uji ulang akses dari HP. Wi-Fi tempat lain bisa memakai *client isolation*, yaitu perangkat di jaringan itu tidak bisa saling terhubung.
- Apakah root CA sudah dipasang di Windows dan HP? Belum dikonfirmasi; status di checklist masih belum dicentang.

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

### 2026-11-26: HTTPS lokal & akses dari HP

- **Dikerjakan:**
  - Pengguna memasang mkcert lewat apt. Sertifikat untuk `localhost`, `127.0.0.1`, dan `192.168.18.100` dibuat di `certs/`.
  - Build produksi dijalankan, dan `start:https` diverifikasi dari laptop (curl 200, sertifikat valid terhadap CA).
  - HP awalnya gagal terhubung. Penyebabnya firewall Hyper-V WSL (inbound Block). Pengguna menambahkan aturan `WSL-Ujian-SMAS` (TCP 3000 dan 3443), lalu HP berhasil membuka `https://192.168.18.100:3443`.
  - Diputuskan tetap memakai HTTPS untuk demo (alasannya di Keputusan).
- **Gagal / dicatat:** unduhan binary mkcert oleh Claude ditolak sistem izin, lalu diganti dengan pemasangan apt oleh pengguna.
- **Belum selesai:**
  - Root CA belum dikonfirmasi terpasang di Windows dan HP. Wake Lock belum diuji.
  - `data/ujian.db` belum di-reset (jadwal dummy masih dari 13:48).
  - Perubahan `CONTEXT.md` belum di-commit.
- **Berikutnya:** pasang root CA di Windows dan HP, lalu uji Wake Lock. Setelah itu matikan server, jalankan `npm run demo:reset`, nyalakan `start:https` lagi, dan gladi segmen 2–8 paling lambat Jumat, 27 Nov.

### 2026-11-26: Orientasi & dokumentasi agen

- Menganalisis struktur proyek, kondisi git (fork dan upstream sinkron), dan kondisi npm (lihat bagian status).
- Menambahkan `CLAUDE.md`, `CONTEXT.md`, `.claude/settings.json` (izin perintah verifikasi), slash command `/cek` dan `/handoff`, serta `docs/README.md`.
- **Berikutnya:** buat `.env` dan DB lokal, siapkan sertifikat HTTPS, lalu jalankan gladi segmen 2–8 sesuai checklist di atas.
