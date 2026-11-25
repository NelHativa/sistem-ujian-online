import { prisma } from './db';
import { ringkasPerangkat } from './perangkat';

export type KonteksReq = { ip: string | null; ua: string | null };

export function konteksDari(req: Request): KonteksReq {
  const h = req.headers;
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  return { ip, ua: h.get('user-agent') };
}

export async function catatLog(args: {
  kode: string;
  aktorTipe: 'SISWA' | 'GURU' | 'ADMIN' | 'SISTEM' | 'ANONIM';
  aktorId?: string | number | null;
  pesertaId?: number | null;
  sesiId?: number | null;
  data?: Record<string, unknown>;
  ctx?: KonteksReq;
  waktu?: Date;
}) {
  await prisma.logAktivitas.create({
    data: {
      kode: args.kode,
      aktorTipe: args.aktorTipe,
      aktorId: args.aktorId != null ? String(args.aktorId) : null,
      pesertaId: args.pesertaId ?? null,
      sesiId: args.sesiId ?? null,
      data: JSON.stringify(args.data ?? {}),
      ip: args.ctx?.ip ?? null,
      perangkat: args.ctx?.ua ? ringkasPerangkat(args.ctx.ua) : null,
      ...(args.waktu ? { waktu: args.waktu } : {}),
    },
  });
}

export const LABEL_LOG: Record<string, string> = {
  LOGIN_BERHASIL: 'Login berhasil',
  LOGIN_GAGAL: 'Login gagal',
  LOGIN_DITOLAK_SESI_AKTIF: 'Login ditolak: akun aktif di perangkat lain',
  LOGOUT: 'Logout',
  TOKEN_BENAR: 'Token benar',
  TOKEN_SALAH: 'Token salah',
  MASUK_UJIAN: 'Masuk ujian (membuka halaman soal)',
  JAWABAN_DISIMPAN: 'Jawaban disimpan',
  JAWABAN_DITOLAK_WAKTU: 'Penyimpanan ditolak: melewati toleransi edit',
  KELUAR_TAB: 'Keluar dari halaman ujian',
  KEMBALI_TAB: 'Kembali ke halaman ujian',
  SIRINE_DIBUNYIKAN: 'Sirine dibunyikan',
  PRINTSCREEN_TERDETEKSI: 'Tangkapan layar terdeteksi',
  KELUAR_LAYAR_PENUH: 'Keluar dari layar penuh',
  WAKE_LOCK_TIDAK_TERSEDIA: 'Layar tetap menyala tidak tersedia',
  KONEKSI_PUTUS: 'Koneksi terputus',
  KONEKSI_TERSAMBUNG: 'Koneksi tersambung kembali',
  KUMPUL_MANUAL: 'Dikumpulkan manual',
  KUMPUL_OTOMATIS: 'Dikumpulkan otomatis oleh sistem',
  KUMPUL_PAKSA_ADMIN: 'Dikumpulkan paksa oleh admin',
  RESET_LOGIN: 'Admin mereset sesi login',
  TOKEN_DIUBAH: 'Token diubah',
  NILAI_DIUBAH: 'Nilai diisi/diubah',
  SESI_DIBUAT: 'Sesi dibuat',
  SESI_DITUTUP: 'Sesi ditutup',
  PAKET_FINAL: 'Paket soal difinalkan',
  PAKET_DRAF: 'Status final dibatalkan',
  PENGATURAN_DIUBAH: 'Pengaturan diubah',
};

export const KODE_PELANGGARAN = new Set(['KELUAR_TAB', 'PRINTSCREEN_TERDETEKSI', 'SIRINE_DIBUNYIKAN', 'KELUAR_LAYAR_PENUH']);
