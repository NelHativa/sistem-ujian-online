import { prisma } from './db';

export type Pengaturan = {
  namaSekolah: string;
  tahunAjaran: string;
  semester: string;
  toleransiEditMenit: number;
  toleransiKumpulMenit: number;
  batasTerlambatDefault: number;
};

const DEFAULTS: Pengaturan = {
  namaSekolah: 'SMAS Bina Taruna',
  tahunAjaran: '2026/2027',
  semester: 'Ganjil',
  toleransiEditMenit: 1,
  toleransiKumpulMenit: 15,
  batasTerlambatDefault: 10,
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
  };
}

export async function setPengaturan(kunci: keyof Pengaturan, nilai: string | number) {
  await prisma.pengaturan.upsert({
    where: { kunci },
    create: { kunci, nilai: String(nilai) },
    update: { nilai: String(nilai) },
  });
}
