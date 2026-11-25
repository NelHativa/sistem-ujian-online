// Pekerjaan terjadwal di server: paksa kumpul & menutup sesi (WAKTU-03, ABS-04).
// Berjalan di server sehingga tidak bergantung pada HP siswa yang masih online.
import { prisma } from './db';
import { catatLog } from './log';
import { getPengaturan } from './settings';
import { batasKumpul } from './waktu';

let berjalan = false;

export async function sapuSesi(now = new Date()) {
  if (berjalan) return;
  berjalan = true;
  try {
    const t = await getPengaturan();
    const terbuka = await prisma.sesiUjian.findMany({ where: { ditutupAt: null } });
    for (const sesi of terbuka) {
      if (now < batasKumpul(sesi.selesai, t)) continue;
      await tutupSesi(sesi.id, now);
    }
  } finally {
    berjalan = false;
  }
}

export async function tutupSesi(sesiId: number, now = new Date()) {
  const peserta = await prisma.pesertaSesi.findMany({ where: { sesiId } });
  for (const p of peserta) {
    if (p.jamMasuk && !p.jamKumpul) {
      await prisma.pesertaSesi.update({
        where: { id: p.id },
        data: { jamKumpul: now, caraKumpul: 'OTOMATIS', sedangKeluarSejak: null },
      });
      await catatLog({ kode: 'KUMPUL_OTOMATIS', aktorTipe: 'SISTEM', pesertaId: p.id, sesiId, data: {} });
    } else if (!p.jamMasuk && p.kehadiran === 'BELUM') {
      await prisma.pesertaSesi.update({ where: { id: p.id }, data: { kehadiran: 'TIDAK_HADIR' } });
    }
  }
  await prisma.sesiUjian.update({ where: { id: sesiId }, data: { ditutupAt: now } });
  await catatLog({ kode: 'SESI_DITUTUP', aktorTipe: 'SISTEM', sesiId, data: {} });
}

export function mulaiPenjadwal() {
  const g = globalThis as unknown as { __penjadwalUjian?: NodeJS.Timeout };
  if (g.__penjadwalUjian) return;
  g.__penjadwalUjian = setInterval(() => {
    sapuSesi().catch((e) => console.error('[penjadwal] gagal menyapu sesi', e));
  }, 5_000);
  console.log('[penjadwal] paksa kumpul & penutupan sesi aktif (tiap 5 detik)');
}
