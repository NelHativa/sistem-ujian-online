import { existsSync } from 'fs';
import path from 'path';
import { prisma } from './db';
import { FOLDER_UNGGAHAN } from './unggahan';

export type SoalValidasi = {
  nomor: number;
  tipe: string;
  teks: string;
  gambar: string;
  bobot: number;
  opsi: { teks: string; benar: boolean }[];
};

/** SOAL-08: validasi kelengkapan sebelum finalisasi. */
export function validasiPaket(soal: SoalValidasi[]) {
  const masalah: string[] = [];
  if (soal.length === 0) masalah.push('Paket belum berisi soal.');
  for (const s of soal) {
    const n = `Soal ${s.nomor}`;
    if (!s.teks.trim()) masalah.push(`${n}: teks soal kosong.`);
    if (s.bobot < 1) masalah.push(`${n}: bobot minimal 1.`);
    for (const g of JSON.parse(s.gambar) as string[]) {
      if (!existsSync(path.join(FOLDER_UNGGAHAN, g))) masalah.push(`${n}: gambar "${g}" tidak ditemukan, unggah ulang.`);
    }
    if (s.tipe === 'ESAI') continue;
    const benar = s.opsi.filter((o) => o.benar).length;
    if (s.opsi.some((o) => !o.teks.trim())) masalah.push(`${n}: ada opsi jawaban yang kosong.`);
    if (s.tipe === 'PG') {
      if (s.opsi.length < 2 || s.opsi.length > 5) masalah.push(`${n}: pilihan ganda harus 2–5 opsi.`);
      if (benar !== 1) masalah.push(`${n}: pilih tepat satu kunci jawaban.`);
    }
    if (s.tipe === 'PGK') {
      if (s.opsi.length < 3 || s.opsi.length > 5) masalah.push(`${n}: pilihan ganda kompleks harus 3–5 opsi.`);
      if (benar < 2) masalah.push(`${n}: pilihan ganda kompleks perlu minimal dua kunci jawaban.`);
    }
    if (s.tipe === 'BS' && benar !== 1) masalah.push(`${n}: tentukan kunci Benar atau Salah.`);
  }
  const perTipe: Record<string, number> = { PG: 0, PGK: 0, BS: 0, ESAI: 0 };
  for (const s of soal) perTipe[s.tipe] = (perTipe[s.tipe] ?? 0) + 1;
  return { masalah, perTipe, totalBobot: soal.reduce((a, s) => a + s.bobot, 0), jumlah: soal.length };
}

/** SOAL-09: paket terkunci setelah sesi pertama yang memakainya dimulai. */
export async function paketTerkunci(paketId: number) {
  const n = await prisma.sesiUjian.count({ where: { paketId, mulai: { lte: new Date() } } });
  return n > 0;
}

export async function paketMilikGuru(paketId: number, guruId: number) {
  const p = await prisma.paketSoal.findUnique({ where: { id: paketId } });
  return p && p.guruId === guruId ? p : null;
}
