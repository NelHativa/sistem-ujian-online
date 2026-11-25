import { prisma } from './db';

export type Pengaturan = {
  namaSekolah: string;
  tahunAjaran: string;
  semester: string;
  toleransiEditMenit: number;
  toleransiKumpulMenit: number;
  batasTerlambatDefault: number;
  /** Fitur ganti password oleh siswa/guru/admin dan reset password oleh admin. */
  gantiPasswordAktif: boolean;
};

const DEFAULTS: Pengaturan = {
  namaSekolah: 'SMAS Bina Taruna',
  tahunAjaran: '2026/2027',
  semester: 'Ganjil',
  toleransiEditMenit: 1,
  toleransiKumpulMenit: 15,
  batasTerlambatDefault: 10,
  gantiPasswordAktif: false,
};

export async function getPengaturan(): Promise<Pengaturan> {
  const rows = await prisma.pengaturan.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.kunci, r.nilai]));
  return {
    namaSekolah: map.namaSekolah ?? DEFAULTS.namaSekolah,
    tahunAjaran: map.tahunAjaran ?? DEFAULTS.tahunAjaran,
    semester: map.semester ?? DEFAULTS.semester,
    toleransiEditMenit: Number(map.toleransiEditMenit ?? DEFAULTS.toleransiEditMenit),
    toleransiKumpulMenit: Number(map.toleransiKumpulMenit ?? DEFAULTS.toleransiKumpulMenit),
    batasTerlambatDefault: Number(map.batasTerlambatDefault ?? DEFAULTS.batasTerlambatDefault),
    gantiPasswordAktif: map.gantiPasswordAktif != null ? map.gantiPasswordAktif === '1' : DEFAULTS.gantiPasswordAktif,
  };
}

export async function setPengaturan(kunci: keyof Pengaturan, nilai: string | number | boolean) {
  const teks = typeof nilai === 'boolean' ? (nilai ? '1' : '0') : String(nilai);
  await prisma.pengaturan.upsert({
    where: { kunci },
    create: { kunci, nilai: teks },
    update: { nilai: teks },
  });
}
