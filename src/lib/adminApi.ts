import { adminLogin } from './auth';
import { prisma } from './db';
import { GalatApi } from './guruApi';

export async function aksesAdmin() {
  const a = await adminLogin();
  if (!a) throw new GalatApi(401, 'Harus login sebagai admin.');
  return a;
}

/** Admin hanya boleh mengelola sesi yang kelasnya berada di grupnya. */
export async function aksesSesiAdmin(sesiId: number) {
  const a = await aksesAdmin();
  const sesi = await prisma.sesiUjian.findUnique({
    where: { id: sesiId },
    include: { kelas: { include: { kelas: true } }, paket: { include: { mapel: true, guru: true } } },
  });
  if (!sesi) throw new GalatApi(404, 'Sesi tidak ditemukan.');
  if (!sesi.kelas.some((k) => a.grupIds.includes(k.kelas.grupId))) throw new GalatApi(403, 'Sesi ini di luar grup Anda.');
  return { ...a, sesi };
}
