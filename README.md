# Ujian SMAS Bina Taruna: demo fungsional (MVP)

Demo Sistem Ujian Online untuk SMAS Bina Taruna, mengikuti **Dokumen MVP Demo** (demo Sabtu, 28 November 2026). Kebutuhan lengkapnya ada di **PRD Sistem Ujian Online v1.0**, dan kode kebutuhan di bawah (AUTH-01, UJI-09, dst.) merujuk ke PRD tersebut.

Stack: Next.js 15 (App Router) + Prisma + SQLite + ExcelJS + Tailwind. Seluruh aturan inti dijalankan di server: waktu, token, satu sesi aktif, penguncian jawaban, dan paksa kumpul. Tampilan memakai sistem desain yayasan (navy `#1E3A8A` + emas `#D4A017`, font Plus Jakarta Sans/Inter) yang sama dengan aplikasi SIMKEU. Semua font dipasang lokal, jadi demo tidak butuh internet.

## Menjalankan

```bash
npm install
cp .env.example .env
npm run demo:reset            # buat database + data dummy, jadwal relatif terhadap "sekarang"
npm run dev                   # http://localhost:3000 (juga bisa dibuka dari perangkat lain di Wi-Fi yang sama)
```

Untuk hari demo, jadwalkan sesi relatif terhadap jam mulai demo (WIB):

```bash
npm run demo:reset -- --mulai 09:00
```

> Matikan server sebelum `demo:reset`, karena perintah ini menghapus `data/ujian.db` lalu membuatnya ulang.

### HTTPS di jaringan lokal (wajib untuk Wake Lock di HP)

`http://192.168.x.x` yang dibuka dari HP tidak dianggap aman oleh browser, sehingga Wake Lock tidak berjalan. Pilih salah satu:

1. **Dev cepat:** `npm run dev:https`. Next.js membuat sertifikat lokal otomatis (mkcert, butuh internet sekali).
2. **Mode produksi (disarankan untuk demo):**
   ```bash
   mkcert -install
   mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 192.168.1.10   # ganti dengan IP laptop server
   npm run build
   npm run start:https    # https://<ip-laptop>:3443
   ```
   Pasang root CA mkcert (`mkcert -CAROOT`) di setiap HP demo, lalu uji paling lambat H-1.

## Akun demo (semua fiktif)

| Peran | Halaman | ID | Password |
|---|---|---|---|
| Siswa: Andi Pratama, XI IPA 1 No. 1 | `/` | `0081230001` (NISN) | `20100315` |
| Siswa: Siti Rahma, XI IPA 1 No. 2 | `/` | `0081230002` | `20100722` |
| Siswa tanpa NISN: Oktaviani, XI IPS 1 | `/` | `2324015` (NIS) | `20101104` |
| Siswa yang masuk terlambat: Rizky Hutapea | `/` | `0081230010` | `20100203` |
| Guru Biologi | `/guru` | `3456789012345678` (NUPTK) | `19850412` |
| Guru Matematika | `/guru` | `161234567890` (NRG) | `19880921` |
| Guru Sejarah | `/guru` | `2019045` (NPK) | `19900517` |
| Admin Angkatan XI | `/admin` | `admin.xi` | `BinaTaruna2026` (`ADMIN_PASSWORD`) |
| Admin Angkatan X | `/admin` | `admin.x` | sama |
| Admin Utama | `/admin` | `admin.utama` | sama |

Siswa lain: NISN `0081230003` s.d. `0081230030` dan `0091240001` s.d. `0091240010`. Passwordnya tanggal lahir (lihat Admin → Data master).

## Data dummy & jadwal (T = jam mulai demo)

| Sesi | Waktu | Token | Catatan |
|---|---|---|---|
| Sejarah Indonesia, XI IPA 1 | T−5 s.d. T+38 menit | `482915` | Berakhir di tengah demo (segmen 6) |
| Biologi, XI IPA 1 | T+15 s.d. T+100 menit | `730264` | Paket masih **Draf** (merah di admin) sampai guru memfinalkan di segmen 2 |
| Matematika, XI IPA 1 + XI IPS 1 | kemarin 07:30–09:00 | `615048` | Sudah ditutup dan berisi jawaban, pelanggaran, 4 siswa Tidak hadir (untuk koreksi, Excel, susulan) |
| Matematika, X IPA 1 | besok 07:30–09:00 | `159376` | Paket Draf (dashboard Admin Angkatan X) |

Toleransi kumpul diambil dari `TOLERANSI_KUMPUL_MENIT` di `.env`. Default demo adalah **3 menit** agar segmen 6 tidak menunggu 15 menit; nilai produksi adalah 15. Admin Utama juga dapat mengubahnya di menu **Pengaturan** (WAKTU-05).

Gambar contoh untuk diunggah guru saat segmen 2 ada di `contoh-gambar/penampang-daun.png`.

## Pemetaan skenario demo

| Segmen | Yang dibuka |
|---|---|
| 2. Menyusun soal | `/guru` (Guru Biologi) → paket Biologi → Tambah soal (Benar/Salah + soal bergambar) → Pratinjau HP/Desktop → Finalkan |
| 3. Menyiapkan sesi | `/admin` (`admin.xi`) → sesi Biologi kini "Final · siap" → Pantau → token tampil besar / Edit |
| 4. Mengerjakan | Siswa login sebelum T+15: Biologi menampilkan hitung mundur dan tombol nonaktif. Andi & Siti berdampingan menampilkan urutan opsi berbeda. Rizky masuk belakangan dan tercatat Terlambat. Login Andi di perangkat lain ditolak → admin Reset → Andi melanjutkan dengan jawaban utuh. Wi-Fi dimatikan → indikator Offline → dinyalakan → tersinkron |
| 5. Anti-kecurangan | Klik kanan/salin mati, watermark nama·NIS·jam, PrintScreen di laptop menutup layar. Keluar tab 3× → 2 peringatan + sirine, baris merah & notifikasi di dashboard |
| 6. Aturan waktu | Sesi Sejarah: pita "Waktu habis" (1 menit) → "Jawaban terkunci", tombol Kumpulkan tetap aktif → server memaksa kumpul (Otomatis) dan menandai Tidak hadir |
| 7. Koreksi | `/guru` (Guru Matematika) → Koreksi & Nilai → XI IPA 1 → koreksi siswa (nilai saran, poin esai, 85,5 dan 101 ditolak) → Log → Ekspor Excel |
| 8. Susulan | Admin → sesi Matematika kemarin → **Buat sesi susulan** dari daftar Tidak hadir |

## Cakupan MVP

Sudah dibangun: AUTH-01..07 dan 09 (captcha gambar buatan server sendiri), satu sesi aktif + reset admin, penyusunan 4 tipe soal + gambar + bobot + soal hitungan, pratinjau, validasi, Draf/Final dan penguncian paket, opsi diacak per siswa (deterministik), sesi + token (otomatis/edit/buat ulang, token lama langsung tidak berlaku), seluruh halaman ujian (UJI-01..15), simpan otomatis + antrean offline + pemulihan setelah reload, aturan waktu dan paksa kumpul di server (berjalan tiap 5 detik, tidak bergantung pada HP siswa), absensi Hadir/Terlambat/Tidak hadir, susulan dengan paket yang sama, anti-kecurangan AMAN-01..10, log + lini masa per siswa, dashboard pemantauan (polling 5 detik, filter, notifikasi pelanggaran ke-3), koreksi + Nilai Akhir + riwayat perubahan, dan ekspor Excel (sheet Rekap Nilai, Ringkasan, Pelanggaran sesuai Lampiran A).

Disederhanakan atau ditunda sesuai dokumen MVP: data master hanya dapat dilihat (diisi lewat seed), tanpa halaman kelola admin, tanpa import Excel/Dapodik, tanpa salin/import paket, tanpa rekap semua mapel, dan tanpa ekspor log. Skala 1.000 pengguna, cloud, dan backup masuk Fase Pilot.

Catatan perilaku:
- Satu sesi aktif berlaku ketat untuk **siswa**. Untuk guru dan admin, login terbaru menggantikan sesi sebelumnya agar presenter mudah berpindah perangkat.
- Pelanggaran dihitung dari `visibilitychange` dan `blur` jendela. Klik di address bar juga terhitung karena fokus meninggalkan halaman.
- Di HP, browser dapat menahan suara dari tab yang berada di latar. Sirine diulang saat siswa kembali, dan pelanggaran tetap tercatat.

## Struktur

```
prisma/schema.prisma      model data (PRD bagian 7)
prisma/seed.ts            data dummy + jadwal relatif
scripts/reset-demo.ts     npm run demo:reset
scripts/https-server.ts   server HTTPS lokal
src/lib/                  aturan inti: waktu, penilaian, penutupan sesi, log, captcha, Excel
src/app/api/ujian/...     API halaman ujian siswa
src/app/(guru|admin)/...  halaman guru & admin
src/components/ujian/     layar ujian, simpan otomatis, anti-kecurangan
tests/                    unit test aturan inti (npm test)
```
