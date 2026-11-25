// Skor saran (NILAI-03, NILAI-04).

export type SoalNilai = {
  id: number;
  nomor: number;
  tipe: string;
  bobot: number;
  opsi: { id: number; benar: boolean }[];
};

export function parseIsi(isi: string | null | undefined): unknown {
  if (isi == null) return null;
  try {
    return JSON.parse(isi);
  } catch {
    return null;
  }
}

export function sudahDijawab(tipe: string, isi: unknown) {
  if (isi == null) return false;
  if (tipe === 'PGK') return Array.isArray(isi) && isi.length > 0;
  if (tipe === 'ESAI') return typeof isi === 'string' && isi.trim().length > 0;
  return typeof isi === 'number';
}

/** true/false untuk soal objektif, null untuk esai. */
export function cekBenar(soal: SoalNilai, isi: unknown): boolean | null {
  if (soal.tipe === 'ESAI') return null;
  const kunci = soal.opsi.filter((o) => o.benar).map((o) => o.id).sort((a, b) => a - b);
  if (soal.tipe === 'PGK') {
    if (!Array.isArray(isi)) return false;
    const pilih = [...new Set(isi as number[])].sort((a, b) => a - b);
    return pilih.length === kunci.length && pilih.every((v, i) => v === kunci[i]);
  }
  return typeof isi === 'number' && kunci.length === 1 && kunci[0] === isi;
}

export function hitungNilai(
  soal: SoalNilai[],
  jawaban: Map<number, unknown>,
  poinEsai: Record<string, number>,
) {
  let totalBobot = 0;
  let totalObjektif = 0;
  let skorObjektif = 0;
  let poinEsaiTotal = 0;
  let dijawab = 0;
  let adaEsai = false;
  let esaiDinilaiSemua = true;
  for (const s of soal) {
    totalBobot += s.bobot;
    const isi = jawaban.get(s.id);
    if (sudahDijawab(s.tipe, isi)) dijawab++;
    if (s.tipe === 'ESAI') {
      adaEsai = true;
      const p = poinEsai[String(s.id)];
      if (typeof p === 'number') poinEsaiTotal += Math.min(Math.max(p, 0), s.bobot);
      else esaiDinilaiSemua = false;
    } else {
      totalObjektif += s.bobot;
      if (cekBenar(s, isi)) skorObjektif += s.bobot;
    }
  }
  const diperoleh = skorObjektif + poinEsaiTotal;
  const nilaiSaran = totalBobot > 0 ? Math.round((diperoleh / totalBobot) * 100) : 0;
  return { totalBobot, totalObjektif, skorObjektif, poinEsaiTotal, dijawab, nilaiSaran, adaEsai, esaiDinilaiSemua };
}

/** NILAI-05: bilangan bulat 0–100, desimal (85,5 / 85.5) dan di luar rentang ditolak. */
export function validasiNilaiAkhir(input: unknown): { ok: true; nilai: number | null } | { ok: false; pesan: string } {
  if (input === null || input === '' || input === undefined) return { ok: true, nilai: null };
  const s = String(input).trim();
  if (!/^\d+$/.test(s)) return { ok: false, pesan: 'Nilai Akhir harus bilangan bulat tanpa koma (0–100).' };
  const n = Number(s);
  if (n < 0 || n > 100) return { ok: false, pesan: 'Nilai Akhir harus di antara 0 dan 100.' };
  return { ok: true, nilai: n };
}
