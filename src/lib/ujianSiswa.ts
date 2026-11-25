import { NextResponse } from 'next/server';
import { acakDeterministik } from './acak';
import { siswaLogin } from './auth';
import { prisma } from './db';
import { parseIsi } from './penilaian';
import { getPengaturan } from './settings';
import { batasEdit, batasKumpul, faseSesi } from './waktu';

export type Langkah = 'BELUM_MULAI' | 'TOKEN' | 'KONFIRMASI' | 'KERJAKAN' | 'SELESAI' | 'TERTUTUP' | 'BELUM_FINAL';

export class GalatUjian extends Error {
  constructor(
    public status: number,
    public pesan: string,
    public kode?: string,
  ) {
    super(pesan);
  }
}

export function jawabGalat(e: unknown) {
  if (e instanceof GalatUjian) return NextResponse.json({ pesan: e.pesan, kode: e.kode }, { status: e.status });
  console.error(e);
  return NextResponse.json({ pesan: 'Terjadi kesalahan di server.' }, { status: 500 });
}

/** Memuat konteks ujian untuk siswa yang sedang login; melempar GalatUjian bila tidak berhak. */
export async function konteksUjian(sesiId: number) {
  const login = await siswaLogin();
  if (!login) throw new GalatUjian(401, 'Sesi login berakhir. Silakan login kembali.', 'LOGIN');
  const peserta = await prisma.pesertaSesi.findUnique({
    where: { sesiId_siswaId: { sesiId, siswaId: login.siswa.id } },
    include: { sesi: { include: { paket: { include: { mapel: true } } } } },
  });
  if (!peserta) throw new GalatUjian(404, 'Anda tidak terdaftar sebagai peserta sesi ini.');
  const t = await getPengaturan();
  const now = new Date();
  const fase = faseSesi(peserta.sesi, t, now);
  const tokenOk = peserta.tokenLoginId === login.sesiLogin.id;

  let langkah: Langkah;
  if (peserta.jamKumpul) langkah = 'SELESAI';
  else if (fase === 'BELUM_MULAI') langkah = 'BELUM_MULAI';
  else if (fase === 'DITUTUP') langkah = 'TERTUTUP';
  else if (!peserta.jamMasuk && fase !== 'BERLANGSUNG') langkah = 'TERTUTUP'; // WAKTU-04
  else if (peserta.sesi.paket.status !== 'FINAL') langkah = 'BELUM_FINAL';
  else if (!tokenOk) langkah = 'TOKEN';
  else if (!peserta.jamMasuk) langkah = 'KONFIRMASI';
  else langkah = 'KERJAKAN';

  return { login, peserta, sesi: peserta.sesi, t, now, fase, langkah };
}

export function waktuSesi(sesi: { mulai: Date; selesai: Date }, t: Awaited<ReturnType<typeof getPengaturan>>) {
  return {
    mulai: sesi.mulai.toISOString(),
    selesai: sesi.selesai.toISOString(),
    batasEdit: batasEdit(sesi.selesai, t).toISOString(),
    batasKumpul: batasKumpul(sesi.selesai, t).toISOString(),
  };
}

/** Soal untuk perangkat siswa: tanpa kunci, opsi PG/PGK diacak per siswa (SOAL-10). */
export async function soalUntukSiswa(paketId: number, seed: number) {
  const soal = await prisma.soal.findMany({
    where: { paketId },
    orderBy: { nomor: 'asc' },
    include: { opsi: { orderBy: { urutan: 'asc' } } },
  });
  return soal.map((s) => {
    const opsi = s.opsi.map((o) => ({ id: o.id, teks: o.teks }));
    return {
      id: s.id,
      nomor: s.nomor,
      tipe: s.tipe,
      teks: s.teks,
      gambar: JSON.parse(s.gambar) as string[],
      hitungan: s.hitungan,
      opsi: s.tipe === 'PG' || s.tipe === 'PGK' ? acakDeterministik(opsi, seed, s.id) : opsi,
    };
  });
}

export async function jawabanPeserta(pesertaId: number) {
  const rows = await prisma.jawaban.findMany({ where: { pesertaId } });
  return Object.fromEntries(rows.map((r) => [r.soalId, { isi: parseIsi(r.isi), ragu: r.ragu }]));
}
