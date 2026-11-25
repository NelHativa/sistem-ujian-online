export type OpsiSiswa = { id: number; teks: string };
export type SoalSiswa = {
  id: number;
  nomor: number;
  tipe: 'PG' | 'PGK' | 'BS' | 'ESAI' | string;
  teks: string;
  gambar: string[];
  hitungan: boolean;
  opsi: OpsiSiswa[];
};
export type IsiJawaban = number | number[] | string | null;
export type JawabanSiswa = { isi: IsiJawaban; ragu: boolean };

export function terjawab(s: SoalSiswa, j?: JawabanSiswa) {
  if (!j || j.isi == null) return false;
  if (s.tipe === 'PGK') return Array.isArray(j.isi) && j.isi.length > 0;
  if (s.tipe === 'ESAI') return typeof j.isi === 'string' && j.isi.trim().length > 0;
  return typeof j.isi === 'number';
}

export const HURUF = ['A', 'B', 'C', 'D', 'E', 'F'];

export const INSTRUKSI_HITUNGAN =
  'Kerjakan langkah dan rumus di kertas yang disediakan. Tuliskan jawaban akhir di kolom ini.';
