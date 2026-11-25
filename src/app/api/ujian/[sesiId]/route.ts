import { NextResponse } from 'next/server';
import { jawabanPeserta, jawabGalat, konteksUjian, soalUntukSiswa, waktuSesi } from '@/lib/ujianSiswa';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ sesiId: string }> }) {
  try {
    const { sesiId } = await params;
    const k = await konteksUjian(Number(sesiId));
    const { siswa } = k.login;
    const base = {
      serverNow: k.now.toISOString(),
      fase: k.fase,
      langkah: k.langkah,
      waktu: waktuSesi(k.sesi, k.t),
      identitas: {
        nama: siswa.nama,
        nis: siswa.nis,
        nisn: siswa.nisn,
        noUrut: siswa.noUrut,
        kelas: siswa.kelas.nama,
        mapel: k.sesi.paket.mapel.nama,
        jenisUjian: k.sesi.paket.jenisUjian,
        tipeSesi: k.sesi.tipe,
      },
      pesertaId: k.peserta.id,
      jamKumpul: k.peserta.jamKumpul?.toISOString() ?? null,
      pelanggaran: k.peserta.pelanggaran,
      adaHitungan: false,
      toleransi: { edit: k.t.toleransiEditMenit, kumpul: k.t.toleransiKumpulMenit },
    };
    if (k.langkah === 'KONFIRMASI') {
      const soal = await soalUntukSiswa(k.sesi.paketId, k.peserta.seed);
      return NextResponse.json({ ...base, jumlahSoal: soal.length, adaHitungan: soal.some((s) => s.hitungan) });
    }
    if (k.langkah !== 'KERJAKAN') return NextResponse.json(base);
    // Isi soal hanya dikirim saat sesi berlangsung dan token benar.
    const soal = await soalUntukSiswa(k.sesi.paketId, k.peserta.seed);
    const jawaban = await jawabanPeserta(k.peserta.id);
    return NextResponse.json({ ...base, soal, jawaban, jumlahSoal: soal.length, adaHitungan: soal.some((s) => s.hitungan) });
  } catch (e) {
    return jawabGalat(e);
  }
}
