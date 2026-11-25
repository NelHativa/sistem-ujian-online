/**
 * Seed data dummy demo Sistem Ujian Online SMAS Bina Taruna.
 *
 * Pemakaian:
 *   npm run demo:reset                      -> reset DB, jadwal relatif terhadap "sekarang"
 *   npm run demo:reset -- --mulai 09:00     -> jadwal relatif terhadap jam mulai demo (WIB, hari ini)
 *
 * Jadwal (T = jam mulai demo):
 *   - Sejarah Indonesia XI IPA 1 : T-5 menit  s.d. T+38 menit (berakhir saat segmen 6)
 *   - Biologi XI IPA 1           : T+15 menit s.d. T+100 menit (paket masih Draf; difinalkan guru di segmen 2)
 *   - Matematika XI IPA 1 & XI IPS 1 : kemarin 07:30–09:00, sudah ditutup dan berisi jawaban (segmen 7 & 8)
 *   - Matematika X IPA 1         : besok 07:30–09:00 (paket Draf, tampil merah di dashboard Admin Angkatan X)
 * Semua nama dan nomor induk fiktif.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { copyFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs';
import path from 'path';

try {
  process.loadEnvFile('.env');
} catch {
  /* .env opsional */
}
const prisma = new PrismaClient();
const MENIT = 60_000;

function arg(nama: string) {
  const i = process.argv.indexOf(`--${nama}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function jamDemo(): Date {
  const m = arg('mulai') ?? process.env.DEMO_MULAI;
  const now = new Date();
  if (!m) {
    now.setSeconds(0, 0);
    return now;
  }
  const tgl = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now);
  return new Date(`${tgl}T${m.padStart(5, '0')}:00+07:00`);
}

function waktuWIB(hariOffset: number, hhmm: string) {
  const d = new Date(Date.now() + hariOffset * 24 * 60 * MENIT);
  const tgl = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
  return new Date(`${tgl}T${hhmm}:00+07:00`);
}

let rngState = 20261128;
function rnd() {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
const seedAcak = () => Math.floor(rnd() * 2 ** 31);

const hash = (pw: string) => bcrypt.hashSync(pw, 8);

type SoalInput = {
  tipe: 'PG' | 'PGK' | 'BS' | 'ESAI';
  teks: string;
  opsi?: [string, boolean][];
  bobot?: number;
  gambar?: string[];
  hitungan?: boolean;
  pedoman?: string;
};

const BS: (benar: boolean) => [string, boolean][] = (benar) => [
  ['Benar', benar],
  ['Salah', !benar],
];

async function buatPaket(args: {
  judul: string;
  mapelId: number;
  tingkat: string;
  guruId: number;
  status: 'DRAF' | 'FINAL';
  soal: SoalInput[];
}) {
  const paket = await prisma.paketSoal.create({
    data: {
      judul: args.judul,
      mapelId: args.mapelId,
      tingkat: args.tingkat,
      jenisUjian: 'PAS',
      guruId: args.guruId,
      status: args.status,
      finalAt: args.status === 'FINAL' ? new Date(Date.now() - 2 * 24 * 60 * MENIT) : null,
    },
  });
  for (const [i, s] of args.soal.entries()) {
    await prisma.soal.create({
      data: {
        paketId: paket.id,
        nomor: i + 1,
        tipe: s.tipe,
        teks: s.teks,
        bobot: s.bobot ?? 1,
        gambar: JSON.stringify(s.gambar ?? []),
        hitungan: s.hitungan ?? false,
        pedoman: s.pedoman ?? null,
        opsi: { create: (s.opsi ?? []).map(([teks, benar], urutan) => ({ teks, benar, urutan })) },
      },
    });
  }
  return prisma.paketSoal.findUniqueOrThrow({ where: { id: paket.id }, include: { soal: { include: { opsi: true } } } });
}

async function main() {
  const T = jamDemo();
  console.log(`Jam mulai demo (T): ${T.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);

  // Salin gambar contoh ke folder unggahan.
  const uploads = path.join(process.cwd(), 'data', 'uploads');
  if (existsSync(uploads)) {
    for (const f of readdirSync(uploads)) if (f !== '.gitkeep') rmSync(path.join(uploads, f));
  }
  mkdirSync(uploads, { recursive: true });
  for (const f of ['sel-hewan.svg', 'jaring-makanan.svg']) {
    copyFileSync(path.join(process.cwd(), 'prisma', 'aset', f), path.join(uploads, f));
  }

  // Pengaturan global
  const pengaturan: Record<string, string> = {
    namaSekolah: 'SMAS Bina Taruna',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    toleransiEditMenit: process.env.TOLERANSI_EDIT_MENIT ?? '1',
    toleransiKumpulMenit: process.env.TOLERANSI_KUMPUL_MENIT ?? '15',
    batasTerlambatDefault: '10',
    // Fitur ganti password dimatikan untuk demo; Admin Utama dapat menyalakannya di menu Pengaturan.
    gantiPasswordAktif: '0',
  };
  for (const [kunci, nilai] of Object.entries(pengaturan)) await prisma.pengaturan.create({ data: { kunci, nilai } });

  // Grup & kelas
  const gX = await prisma.grupKelas.create({ data: { nama: 'Angkatan X' } });
  const gXI = await prisma.grupKelas.create({ data: { nama: 'Angkatan XI' } });
  const kelasDef = [
    { nama: 'X IPA 1', tingkat: 'X', jurusan: 'IPA', nomor: 1, grupId: gX.id },
    { nama: 'XI IPA 1', tingkat: 'XI', jurusan: 'IPA', nomor: 1, grupId: gXI.id },
    { nama: 'XI IPS 1', tingkat: 'XI', jurusan: 'IPS', nomor: 1, grupId: gXI.id },
    { nama: 'XI IPS 2', tingkat: 'XI', jurusan: 'IPS', nomor: 2, grupId: gXI.id },
  ];
  const kelas: Record<string, number> = {};
  for (const k of kelasDef) kelas[k.nama] = (await prisma.kelas.create({ data: k })).id;

  // Siswa (fiktif)
  type S = [nama: string, jk: 'L' | 'P', tgl: string, nisn: string | null];
  const daftar: Record<string, { nisAwal: number; siswa: S[] }> = {
    'XI IPA 1': {
      nisAwal: 2324001,
      siswa: [
        ['Andi Pratama', 'L', '20100315', '0081230001'],
        ['Siti Rahma', 'P', '20100722', '0081230002'],
        ['Bagas Saputra Nainggolan', 'L', '20100109', '0081230003'],
        ['Cindy Aurelia Tarigan', 'P', '20100530', '0081230004'],
        ['Daniel Sihombing', 'L', '20101218', '0081230005'],
        ['Fitri Handayani Lubis', 'P', '20100827', '0081230006'],
        ['Gilang Ramadhan', 'L', '20100411', '0081230007'],
        ['Indah Permata Sari', 'P', '20100902', '0081230008'],
        ['Joshua Manurung', 'L', '20100625', '0081230009'],
        ['Rizky Hutapea', 'L', '20100203', '0081230010'],
      ],
    },
    'XI IPS 1': {
      nisAwal: 2324011,
      siswa: [
        ['Kevin Siregar', 'L', '20100117', '0081230011'],
        ['Lestari Ningsih', 'P', '20100308', '0081230012'],
        ['Muhammad Fauzan', 'L', '20100719', '0081230013'],
        ['Nadia Putri Harahap', 'P', '20101026', '0081230014'],
        ['Oktaviani Br Ginting', 'P', '20101104', null],
        ['Putra Wijaya', 'L', '20100512', '0081230016'],
        ['Rahel Simatupang', 'P', '20100221', '0081230017'],
        ['Samuel Panjaitan', 'L', '20100916', '0081230018'],
        ['Tasya Amelia', 'P', '20100604', '0081230019'],
        ['Yohanes Situmorang', 'L', '20101130', '0081230020'],
      ],
    },
    'XI IPS 2': {
      nisAwal: 2324021,
      siswa: [
        ['Aditya Nugroho', 'L', '20100214', '0081230021'],
        ['Bunga Citra Lestari', 'P', '20100418', '0081230022'],
        ['Chandra Pardede', 'L', '20100823', '0081230023'],
        ['Dewi Anggraini', 'P', '20100107', '0081230024'],
        ['Erick Sinaga', 'L', '20101009', '0081230025'],
        ['Febriani Purba', 'P', '20100228', '0081230026'],
        ['Hendra Gunawan', 'L', '20100611', '0081230027'],
        ['Intan Maharani', 'P', '20100715', '0081230028'],
        ['Jonathan Silalahi', 'L', '20101203', '0081230029'],
        ['Kartika Dewi Saragih', 'P', '20100320', '0081230030'],
      ],
    },
    'X IPA 1': {
      nisAwal: 2425001,
      siswa: [
        ['Alya Zahra', 'P', '20110112', '0091240001'],
        ['Bima Arya Sembiring', 'L', '20110304', '0091240002'],
        ['Clara Natalia Hutagalung', 'P', '20110521', '0091240003'],
        ['Dimas Prasetyo', 'L', '20110609', '0091240004'],
        ['Elisa Marbun', 'P', '20110817', '0091240005'],
        ['Farhan Akbar', 'L', '20110902', '0091240006'],
        ['Grace Pakpahan', 'P', '20111011', '0091240007'],
        ['Hafiz Maulana', 'L', '20111120', '0091240008'],
        ['Irene Simanjuntak', 'P', '20110226', '0091240009'],
        ['Kenzo Tambunan', 'L', '20110730', '0091240010'],
      ],
    },
  };
  const siswaPerKelas: Record<string, { id: number }[]> = {};
  for (const [namaKelas, d] of Object.entries(daftar)) {
    siswaPerKelas[namaKelas] = [];
    for (const [i, [nama, jk, tgl, nisn]] of d.siswa.entries()) {
      const s = await prisma.siswa.create({
        data: {
          nis: String(d.nisAwal + i),
          nisn,
          nama,
          jk,
          tglLahir: tgl,
          noUrut: i + 1,
          kelasId: kelas[namaKelas],
          passwordHash: hash(tgl),
        },
      });
      siswaPerKelas[namaKelas].push(s);
    }
  }

  // Guru
  const guruBio = await prisma.guru.create({
    data: { nomorInduk: '3456789012345678', jenisNomor: 'NUPTK', nama: 'Rina Simanjuntak, S.Pd.', tglLahir: '19850412', passwordHash: hash('19850412') },
  });
  const guruMat = await prisma.guru.create({
    data: { nomorInduk: '161234567890', jenisNomor: 'NRG', nama: 'Budi Santoso, S.Pd.', tglLahir: '19880921', passwordHash: hash('19880921') },
  });
  const guruSej = await prisma.guru.create({
    data: { nomorInduk: '2019045', jenisNomor: 'NPK', nama: 'Maria Sitompul, S.Pd.', tglLahir: '19900517', passwordHash: hash('19900517') },
  });

  // Admin
  const pwAdmin = process.env.ADMIN_PASSWORD ?? 'BinaTaruna2026';
  await prisma.admin.create({ data: { username: 'admin.utama', nama: 'Operator Sekolah (Admin Utama)', peran: 'UTAMA', passwordHash: hash(pwAdmin) } });
  await prisma.admin.create({
    data: { username: 'admin.x', nama: 'Admin Angkatan X', peran: 'GRUP', passwordHash: hash(pwAdmin), grup: { create: { grupId: gX.id } } },
  });
  await prisma.admin.create({
    data: { username: 'admin.xi', nama: 'Admin Angkatan XI', peran: 'GRUP', passwordHash: hash(pwAdmin), grup: { create: { grupId: gXI.id } } },
  });

  // Mapel & penugasan
  const bio = await prisma.mapel.create({ data: { nama: 'Biologi' } });
  const mat = await prisma.mapel.create({ data: { nama: 'Matematika' } });
  const sej = await prisma.mapel.create({ data: { nama: 'Sejarah Indonesia' } });
  const tugas = [
    [guruBio.id, bio.id, 'XI IPA 1'],
    [guruMat.id, mat.id, 'X IPA 1'],
    [guruMat.id, mat.id, 'XI IPA 1'],
    [guruMat.id, mat.id, 'XI IPS 1'],
    [guruMat.id, mat.id, 'XI IPS 2'],
    [guruSej.id, sej.id, 'XI IPA 1'],
    [guruSej.id, sej.id, 'XI IPS 1'],
    [guruSej.id, sej.id, 'XI IPS 2'],
  ] as const;
  for (const [g, m, k] of tugas) await prisma.penugasan.create({ data: { guruId: g, mapelId: m, kelasId: kelas[k] } });

  // ---------- Paket soal ----------
  const paketBio = await buatPaket({
    judul: 'PAS Biologi Kelas XI',
    mapelId: bio.id,
    tingkat: 'XI',
    guruId: guruBio.id,
    status: 'DRAF',
    soal: [
      {
        tipe: 'PG',
        teks: 'Perhatikan gambar sel hewan berikut. Bagian yang ditunjuk huruf X berfungsi sebagai ...',
        gambar: ['sel-hewan.svg'],
        opsi: [
          ['Pusat pengendali seluruh kegiatan sel', true],
          ['Tempat berlangsungnya respirasi sel', false],
          ['Tempat sintesis protein', false],
          ['Pelindung dan pemberi bentuk sel', false],
          ['Tempat penyimpanan cadangan makanan', false],
        ],
      },
      {
        tipe: 'PG',
        teks: 'Organel sel yang menjadi tempat berlangsungnya respirasi seluler untuk menghasilkan energi (ATP) adalah ...',
        opsi: [
          ['Ribosom', false],
          ['Mitokondria', true],
          ['Lisosom', false],
          ['Badan Golgi', false],
          ['Retikulum endoplasma', false],
        ],
      },
      {
        tipe: 'PGK',
        teks: 'Pilihlah SEMUA pernyataan yang merupakan ciri jaringan meristem!',
        opsi: [
          ['Sel-selnya aktif membelah', true],
          ['Dinding sel tipis', true],
          ['Inti sel relatif besar', true],
          ['Memiliki vakuola yang besar', false],
          ['Sel-selnya sudah terdiferensiasi', false],
        ],
      },
      {
        tipe: 'BS',
        teks: 'Darah yang kaya oksigen dari paru-paru dialirkan menuju jantung melalui vena pulmonalis.',
        opsi: BS(true),
      },
      { tipe: 'BS', teks: 'Enzim amilase di dalam mulut berfungsi mencerna protein menjadi asam amino.', opsi: BS(false) },
      {
        tipe: 'PG',
        teks: 'Berdasarkan diagram jaring-jaring makanan di atas, organisme yang berperan sebagai konsumen tingkat II adalah ...',
        gambar: ['jaring-makanan.svg'],
        opsi: [
          ['Padi dan belalang', false],
          ['Belalang dan tikus', false],
          ['Katak dan ular', true],
          ['Elang dan padi', false],
        ],
      },
      {
        tipe: 'PG',
        teks: 'Sistem peredaran darah manusia disebut sistem peredaran darah ganda karena ...',
        opsi: [
          ['Darah melewati jantung dua kali dalam satu kali peredaran', true],
          ['Jantung memiliki dua serambi dan dua bilik', false],
          ['Darah mengalir di dalam dua jenis pembuluh', false],
          ['Terdapat dua jenis sel darah', false],
        ],
      },
      {
        tipe: 'ESAI',
        teks: 'Jelaskan perbedaan antara transpor aktif dan transpor pasif pada membran sel, lalu berikan masing-masing satu contoh!',
        bobot: 3,
        pedoman:
          'Transpor pasif tidak memerlukan energi, mengikuti gradien konsentrasi (contoh: difusi, osmosis). Transpor aktif memerlukan energi ATP, melawan gradien konsentrasi (contoh: pompa natrium-kalium). Skor: perbedaan 2 poin, contoh 1 poin.',
      },
    ],
  });

  const paketMat = await buatPaket({
    judul: 'PAS Matematika Kelas XI',
    mapelId: mat.id,
    tingkat: 'XI',
    guruId: guruMat.id,
    status: 'FINAL',
    soal: [
      {
        tipe: 'PG',
        teks: 'Nilai dari 2⁵ adalah ...',
        opsi: [
          ['16', false],
          ['25', false],
          ['32', true],
          ['64', false],
          ['10', false],
        ],
      },
      {
        tipe: 'PG',
        teks: 'Turunan pertama dari f(x) = 3x² adalah ...',
        opsi: [
          ['f′(x) = 3x', false],
          ['f′(x) = 6x', true],
          ['f′(x) = 6x²', false],
          ['f′(x) = x³', false],
        ],
      },
      {
        tipe: 'PGK',
        teks: 'Pilihlah SEMUA bilangan prima dari pilihan berikut!',
        opsi: [
          ['2', true],
          ['9', false],
          ['11', true],
          ['15', false],
          ['17', true],
        ],
      },
      { tipe: 'BS', teks: 'Jumlah besar sudut dalam sebuah segitiga adalah 180°.', opsi: BS(true) },
      { tipe: 'BS', teks: 'Hasil dari (−3)² adalah −9.', opsi: BS(false) },
      {
        tipe: 'PG',
        teks: 'Diketahui f(x) = 2x + 3. Nilai f(4) adalah ...',
        opsi: [
          ['8', false],
          ['10', false],
          ['11', true],
          ['14', false],
        ],
      },
      {
        tipe: 'ESAI',
        teks: 'Tentukan nilai x yang memenuhi persamaan 3x − 7 = 2x + 5.',
        hitungan: true,
        bobot: 2,
        pedoman: 'x = 12. Jawaban akhir benar: 2 poin. Langkah di kertas dikoreksi terpisah.',
      },
      {
        tipe: 'ESAI',
        teks: 'Suatu barisan aritmetika memiliki suku pertama 5 dan beda 3. Tentukan suku ke-20 barisan tersebut.',
        hitungan: true,
        bobot: 2,
        pedoman: 'U20 = a + 19b = 5 + 57 = 62. Jawaban akhir benar: 2 poin.',
      },
    ],
  });

  await buatPaket({
    judul: 'PAS Matematika Kelas X',
    mapelId: mat.id,
    tingkat: 'X',
    guruId: guruMat.id,
    status: 'DRAF',
    soal: [
      {
        tipe: 'PG',
        teks: 'Bentuk sederhana dari √50 adalah ...',
        opsi: [
          ['5√2', true],
          ['2√5', false],
          ['25√2', false],
          ['10√5', false],
        ],
      },
      { tipe: 'BS', teks: 'Grafik fungsi kuadrat y = x² terbuka ke atas.', opsi: BS(true) },
      { tipe: 'ESAI', teks: 'Tentukan himpunan penyelesaian dari 2x + 4 = 10.', hitungan: true, bobot: 2 },
    ],
  });

  const paketSej = await buatPaket({
    judul: 'PAS Sejarah Indonesia Kelas XI',
    mapelId: sej.id,
    tingkat: 'XI',
    guruId: guruSej.id,
    status: 'FINAL',
    soal: [
      {
        tipe: 'PG',
        teks: 'Teks Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal ...',
        opsi: [
          ['17 Agustus 1945', true],
          ['18 Agustus 1945', false],
          ['1 Juni 1945', false],
          ['28 Oktober 1928', false],
        ],
      },
      {
        tipe: 'PG',
        teks: 'Organisasi Budi Utomo yang menandai awal Kebangkitan Nasional berdiri pada tahun ...',
        opsi: [
          ['1905', false],
          ['1908', true],
          ['1912', false],
          ['1928', false],
        ],
      },
      {
        tipe: 'PGK',
        teks: 'Pilihlah SEMUA tokoh yang menyampaikan gagasan dasar negara dalam sidang pertama BPUPKI!',
        opsi: [
          ['Ir. Soekarno', true],
          ['Mr. Muhammad Yamin', true],
          ['Prof. Dr. Soepomo', true],
          ['Jenderal Soedirman', false],
          ['Ki Hajar Dewantara', false],
        ],
      },
      { tipe: 'BS', teks: 'Sumpah Pemuda diikrarkan pada tanggal 28 Oktober 1928.', opsi: BS(true) },
      { tipe: 'BS', teks: 'Konferensi Meja Bundar (KMB) dilaksanakan di Jakarta.', opsi: BS(false) },
      {
        tipe: 'ESAI',
        teks: 'Jelaskan latar belakang terjadinya Peristiwa Rengasdengklok menjelang proklamasi kemerdekaan!',
        bobot: 3,
        pedoman:
          'Perbedaan pendapat golongan tua dan golongan muda tentang waktu proklamasi setelah Jepang menyerah kepada Sekutu; golongan muda membawa Soekarno–Hatta ke Rengasdengklok agar tidak terpengaruh Jepang.',
      },
    ],
  });

  // ---------- Sesi ujian ----------
  const t = { edit: Number(pengaturan.toleransiEditMenit), kumpul: Number(pengaturan.toleransiKumpulMenit) };

  async function buatSesi(a: { paketId: number; mulai: Date; selesai: Date; token: string; kelasNama: string[]; ditutup?: boolean }) {
    const sesi = await prisma.sesiUjian.create({
      data: {
        paketId: a.paketId,
        mulai: a.mulai,
        selesai: a.selesai,
        token: a.token,
        batasTerlambatMenit: 10,
        ditutupAt: a.ditutup ? new Date(a.selesai.getTime() + t.kumpul * MENIT) : null,
        kelas: { create: a.kelasNama.map((k) => ({ kelasId: kelas[k] })) },
      },
    });
    for (const k of a.kelasNama) {
      for (const s of siswaPerKelas[k]) {
        await prisma.pesertaSesi.create({ data: { sesiId: sesi.id, siswaId: s.id, seed: seedAcak() } });
      }
    }
    return sesi;
  }

  await buatSesi({
    paketId: paketSej.id,
    mulai: new Date(T.getTime() - 5 * MENIT),
    selesai: new Date(T.getTime() + 38 * MENIT),
    token: '482915',
    kelasNama: ['XI IPA 1'],
  });
  await buatSesi({
    paketId: paketBio.id,
    mulai: new Date(T.getTime() + 15 * MENIT),
    selesai: new Date(T.getTime() + 100 * MENIT),
    token: '730264',
    kelasNama: ['XI IPA 1'],
  });
  const paketMatX = await prisma.paketSoal.findFirstOrThrow({ where: { judul: 'PAS Matematika Kelas X' } });
  await buatSesi({ paketId: paketMatX.id, mulai: waktuWIB(1, '07:30'), selesai: waktuWIB(1, '09:00'), token: '159376', kelasNama: ['X IPA 1'] });

  // Sesi Matematika kemarin: sudah ditutup, berisi jawaban.
  const mulaiMat = waktuWIB(-1, '07:30');
  const selesaiMat = waktuWIB(-1, '09:00');
  const sesiMat = await buatSesi({
    paketId: paketMat.id,
    mulai: mulaiMat,
    selesai: selesaiMat,
    token: '615048',
    kelasNama: ['XI IPA 1', 'XI IPS 1'],
    ditutup: true,
  });
  await isiHasilMatematika(sesiMat.id, mulaiMat, selesaiMat, paketMat, guruMat.nama);

  console.log('Seed selesai.');
  console.log('Token: Sejarah XI IPA 1 = 482915 · Biologi XI IPA 1 = 730264');
}

type PaketLengkap = Awaited<ReturnType<typeof buatPaket>>;

async function isiHasilMatematika(sesiId: number, mulai: Date, selesai: Date, paket: PaketLengkap, namaGuru: string) {
  const peserta = await prisma.pesertaSesi.findMany({
    where: { sesiId },
    include: { siswa: { include: { kelas: true } } },
    orderBy: [{ siswa: { kelasId: 'asc' } }, { siswa: { noUrut: 'asc' } }],
  });
  // Tidak hadir: dua siswa per kelas (kandidat susulan).
  const tidakHadir = new Set(['Gilang Ramadhan', 'Joshua Manurung', 'Putra Wijaya', 'Tasya Amelia']);
  const terlambat = new Set(['Daniel Sihombing', 'Samuel Panjaitan']);
  const pelanggar: Record<string, number> = { 'Bagas Saputra Nainggolan': 3, 'Kevin Siregar': 1, 'Fitri Handayani Lubis': 2 };
  const sudahDinilai = new Set(['Andi Pratama', 'Siti Rahma', 'Cindy Aurelia Tarigan']);

  const jawabanEsai: Record<number, [string, number][]> = {
    7: [
      ['x = 12', 2],
      ['12', 2],
      ['x = 2', 0],
      ['x = 12', 2],
      ['x=-12', 0],
    ],
    8: [
      ['62', 2],
      ['U20 = 62', 2],
      ['65', 0],
      ['59', 0],
      ['62', 2],
    ],
  };

  for (const [idx, p] of peserta.entries()) {
    const nama = p.siswa.nama;
    if (tidakHadir.has(nama)) {
      await prisma.pesertaSesi.update({ where: { id: p.id }, data: { kehadiran: 'TIDAK_HADIR' } });
      continue;
    }
    const jamMasuk = new Date(mulai.getTime() + (terlambat.has(nama) ? 14 + Math.floor(rnd() * 8) : 1 + Math.floor(rnd() * 7)) * MENIT);
    const kehadiran = terlambat.has(nama) ? 'TERLAMBAT' : 'HADIR';
    const otomatis = nama === 'Yohanes Situmorang';
    const jamKumpul = otomatis
      ? new Date(selesai.getTime() + 15 * MENIT)
      : new Date(selesai.getTime() - (5 + Math.floor(rnd() * 30)) * MENIT);
    const nPel = pelanggar[nama] ?? 0;
    const perangkat = idx % 3 === 0 ? 'Laptop/PC · Windows · Chrome' : 'HP · Android · Chrome';

    let durasiTotal = 0;
    const logs: { kode: string; waktu: Date; data: Record<string, unknown> }[] = [
      { kode: 'LOGIN_BERHASIL', waktu: new Date(jamMasuk.getTime() - 3 * MENIT), data: { id: p.siswa.nisn ?? p.siswa.nis } },
      { kode: 'TOKEN_BENAR', waktu: new Date(jamMasuk.getTime() - 1 * MENIT), data: {} },
      { kode: 'MASUK_UJIAN', waktu: jamMasuk, data: { kehadiran } },
    ];

    // Jawaban
    const kualitas = 0.45 + rnd() * 0.5;
    let menitKe = 4;
    for (const soal of paket.soal) {
      let isi: unknown = null;
      if (soal.tipe === 'ESAI') {
        const pilihan = jawabanEsai[soal.nomor];
        isi = pilihan[Math.floor(rnd() * pilihan.length)][0];
        if (rnd() < 0.1) isi = null;
      } else {
        const benar = soal.opsi.filter((o) => o.benar).map((o) => o.id);
        const salah = soal.opsi.filter((o) => !o.benar).map((o) => o.id);
        const tepat = rnd() < kualitas;
        if (soal.tipe === 'PGK') isi = tepat ? benar : [benar[0], salah[0]];
        else isi = tepat ? benar[0] : salah[Math.floor(rnd() * salah.length)];
      }
      if (isi == null) continue;
      const w = new Date(jamMasuk.getTime() + menitKe * MENIT);
      menitKe += 3 + Math.floor(rnd() * 6);
      await prisma.jawaban.create({ data: { pesertaId: p.id, soalId: soal.id, isi: JSON.stringify(isi) } });
      logs.push({ kode: 'JAWABAN_DISIMPAN', waktu: w, data: { nomor: soal.nomor, isi } });
    }

    for (let i = 1; i <= nPel; i++) {
      const keluar = new Date(jamMasuk.getTime() + (10 + i * 12) * MENIT);
      const dur = 8 + Math.floor(rnd() * 40);
      durasiTotal += dur;
      logs.push({ kode: 'KELUAR_TAB', waktu: keluar, data: { urutan: i } });
      if (i >= 3) logs.push({ kode: 'SIRINE_DIBUNYIKAN', waktu: new Date(keluar.getTime() + 500), data: { urutan: i } });
      logs.push({ kode: 'KEMBALI_TAB', waktu: new Date(keluar.getTime() + dur * 1000), data: { urutan: i, durasiDetik: dur } });
    }
    if (nama === 'Bagas Saputra Nainggolan') {
      logs.push({ kode: 'PRINTSCREEN_TERDETEKSI', waktu: new Date(jamMasuk.getTime() + 18 * MENIT), data: { tombol: 'PrintScreen' } });
    }
    logs.push({ kode: otomatis ? 'KUMPUL_OTOMATIS' : 'KUMPUL_MANUAL', waktu: jamKumpul, data: {} });

    await prisma.pesertaSesi.update({
      where: { id: p.id },
      data: {
        kehadiran,
        jamMasuk,
        jamKumpul,
        caraKumpul: otomatis ? 'OTOMATIS' : 'MANUAL',
        pelanggaran: nPel,
        durasiKeluarDetik: durasiTotal,
        sirine: nPel >= 3,
        perangkat,
        lastSeen: jamKumpul,
      },
    });
    for (const l of logs) {
      await prisma.logAktivitas.create({
        data: {
          kode: l.kode,
          aktorTipe: l.kode === 'KUMPUL_OTOMATIS' ? 'SISTEM' : 'SISWA',
          aktorId: String(p.siswaId),
          pesertaId: p.id,
          sesiId,
          data: JSON.stringify(l.data),
          waktu: l.waktu,
          ip: '192.168.1.' + (20 + idx),
          perangkat,
        },
      });
    }

    if (sudahDinilai.has(nama)) {
      const nilai = 70 + Math.floor(rnd() * 25);
      await prisma.nilai.create({ data: { pesertaId: p.id, poinEsai: '{}', nilaiAkhir: nilai, diisiOleh: namaGuru } });
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
