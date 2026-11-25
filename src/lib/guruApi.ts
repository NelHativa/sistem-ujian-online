import { NextResponse } from 'next/server';
import { guruLogin } from './auth';
import { paketMilikGuru } from './paket';

export class GalatApi extends Error {
  constructor(
    public status: number,
    public pesan: string,
  ) {
    super(pesan);
  }
}

export function jawabGalatApi(e: unknown) {
  if (e instanceof GalatApi) return NextResponse.json({ pesan: e.pesan }, { status: e.status });
  console.error(e);
  return NextResponse.json({ pesan: 'Terjadi kesalahan di server.' }, { status: 500 });
}

/** Guru pemilik paket; bila `ubah`, paket harus Draf (Final harus dibatalkan dulu). */
export async function aksesPaket(paketId: number, ubah: boolean) {
  const a = await guruLogin();
  if (!a) throw new GalatApi(401, 'Harus login sebagai guru.');
  const paket = await paketMilikGuru(paketId, a.guru.id);
  if (!paket) throw new GalatApi(404, 'Paket tidak ditemukan.');
  if (ubah && paket.status === 'FINAL') throw new GalatApi(409, 'Paket berstatus Final. Batalkan status Final terlebih dahulu untuk mengubah soal.');
  return { ...a, paket };
}

export type InputSoal = {
  tipe: string;
  teks: string;
  bobot: number;
  hitungan: boolean;
  pedoman: string | null;
  gambar: string[];
  opsi: { teks: string; benar: boolean }[];
};

export function normalSoal(b: Record<string, unknown>): InputSoal {
  const tipe = String(b.tipe);
  if (!['PG', 'PGK', 'BS', 'ESAI'].includes(tipe)) throw new GalatApi(400, 'Tipe soal tidak valid.');
  const bobot = Math.max(1, Math.min(100, Math.round(Number(b.bobot) || 1)));
  const gambar = Array.isArray(b.gambar) ? (b.gambar as unknown[]).map(String).filter((g) => /^[a-zA-Z0-9._-]+$/.test(g)) : [];
  let opsi = Array.isArray(b.opsi)
    ? (b.opsi as { teks?: unknown; benar?: unknown }[]).slice(0, 5).map((o) => ({ teks: String(o.teks ?? ''), benar: !!o.benar }))
    : [];
  if (tipe === 'BS') {
    const kunci = opsi.find((o) => o.benar)?.teks;
    opsi = [
      { teks: 'Benar', benar: kunci === 'Benar' },
      { teks: 'Salah', benar: kunci === 'Salah' },
    ];
  }
  if (tipe === 'ESAI') opsi = [];
  return {
    tipe,
    teks: String(b.teks ?? ''),
    bobot,
    hitungan: !!b.hitungan,
    pedoman: tipe === 'ESAI' ? String(b.pedoman ?? '') || null : null,
    gambar,
    opsi,
  };
}
