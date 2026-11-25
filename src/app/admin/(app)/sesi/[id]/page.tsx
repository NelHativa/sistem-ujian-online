import { notFound } from 'next/navigation';
import { Pantau } from '@/components/admin/Pantau';
import { aksesSesiAdmin } from '@/lib/adminApi';
import { GalatApi } from '@/lib/guruApi';

export default async function HalamanPantau({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  let r;
  try {
    r = await aksesSesiAdmin(id);
  } catch (e) {
    if (e instanceof GalatApi) notFound();
    throw e;
  }
  const s = r.sesi;
  return (
    <Pantau
      sesiId={id}
      info={{
        mapel: s.paket.mapel.nama,
        jenisUjian: s.paket.jenisUjian,
        guru: s.paket.guru.nama,
        tipe: s.tipe,
        kelas: s.kelas.map((k) => ({ id: k.kelas.id, nama: k.kelas.nama })),
        batasTerlambat: s.batasTerlambatMenit,
      }}
    />
  );
}
