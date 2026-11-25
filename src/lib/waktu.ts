// Aturan waktu ujian (PRD 5.6). Seluruh keputusan memakai jam server.

export type FaseSesi = 'BELUM_MULAI' | 'BERLANGSUNG' | 'TOLERANSI_EDIT' | 'TOLERANSI_KUMPUL' | 'DITUTUP';

export type Toleransi = { toleransiEditMenit: number; toleransiKumpulMenit: number };

const MENIT = 60_000;

export function batasEdit(selesai: Date, t: Toleransi) {
  return new Date(selesai.getTime() + t.toleransiEditMenit * MENIT);
}

export function batasKumpul(selesai: Date, t: Toleransi) {
  return new Date(selesai.getTime() + t.toleransiKumpulMenit * MENIT);
}

export function faseSesi(
  sesi: { mulai: Date; selesai: Date; ditutupAt?: Date | null },
  t: Toleransi,
  now = new Date(),
): FaseSesi {
  if (sesi.ditutupAt) return 'DITUTUP';
  const n = now.getTime();
  if (n < sesi.mulai.getTime()) return 'BELUM_MULAI';
  if (n < sesi.selesai.getTime()) return 'BERLANGSUNG';
  if (n < batasEdit(sesi.selesai, t).getTime()) return 'TOLERANSI_EDIT';
  if (n < batasKumpul(sesi.selesai, t).getTime()) return 'TOLERANSI_KUMPUL';
  return 'DITUTUP';
}

export function bolehUbahJawaban(f: FaseSesi) {
  return f === 'BERLANGSUNG' || f === 'TOLERANSI_EDIT';
}

export function bolehKumpul(f: FaseSesi) {
  return f === 'BERLANGSUNG' || f === 'TOLERANSI_EDIT' || f === 'TOLERANSI_KUMPUL';
}

export const LABEL_FASE: Record<FaseSesi, string> = {
  BELUM_MULAI: 'Belum dimulai',
  BERLANGSUNG: 'Berlangsung',
  TOLERANSI_EDIT: 'Toleransi edit',
  TOLERANSI_KUMPUL: 'Toleransi kumpul',
  DITUTUP: 'Selesai',
};

/** Status kehadiran saat siswa pertama kali membuka halaman soal (ABS-01..03). */
export function statusKehadiran(mulai: Date, batasTerlambatMenit: number, masuk: Date) {
  return masuk.getTime() <= mulai.getTime() + batasTerlambatMenit * MENIT ? 'HADIR' : 'TERLAMBAT';
}
