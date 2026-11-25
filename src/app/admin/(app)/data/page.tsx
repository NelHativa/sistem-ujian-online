import { JudulHalaman } from '@/components/StafShell';
import { TombolResetPassword } from '@/components/admin/TombolResetPassword';
import { wajibAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPengaturan } from '@/lib/settings';

export default async function DataMaster({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { admin, grupIds } = await wajibAdmin();
  const { gantiPasswordAktif } = await getPengaturan();
  const resetGuru = gantiPasswordAktif && admin.peran === 'UTAMA';
  const tab = (await searchParams).tab ?? 'siswa';
  const kelas = await prisma.kelas.findMany({ where: { grupId: { in: grupIds } }, include: { grup: true, _count: { select: { siswa: true } } }, orderBy: { nama: 'asc' } });
  const siswa = await prisma.siswa.findMany({ where: { kelasId: { in: kelas.map((k) => k.id) } }, include: { kelas: true }, orderBy: [{ kelasId: 'asc' }, { noUrut: 'asc' }] });
  const guru = await prisma.guru.findMany({ include: { penugasan: { include: { mapel: true, kelas: true } } } });
  const tabs = [
    ['siswa', `Siswa (${siswa.length})`],
    ['guru', `Guru (${guru.length})`],
    ['kelas', `Kelas (${kelas.length})`],
  ];
  return (
    <>
      <JudulHalaman judul="Data master" sub="Mode lihat. Pada demo, data diisi lewat seed; import Excel/Dapodik masuk Fase Pilot." />
      <div className="mb-3 flex gap-1">
        {tabs.map(([k, l]) => (
          <a key={k} href={`?tab=${k}`} className={`btn btn-kecil ${tab === k ? 'bg-navy text-white' : 'border border-slate-300 bg-white text-slate-700'}`}>
            {l}
          </a>
        ))}
      </div>
      <div className="kartu overflow-x-auto">
        {tab === 'siswa' && (
          <table className="tabel">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>No. Urut</th>
                <th>NIS</th>
                <th>NISN</th>
                <th>Nama</th>
                <th>L/P</th>
                <th>Tgl lahir</th>
                {gantiPasswordAktif && <th>Password</th>}
              </tr>
            </thead>
            <tbody>
              {siswa.map((s) => (
                <tr key={s.id}>
                  <td>{s.kelas.nama}</td>
                  <td className="angka">{s.noUrut}</td>
                  <td className="font-mono text-sm">{s.nis}</td>
                  <td className="font-mono text-sm">{s.nisn ?? <span className="text-slate-400">— (login pakai NIS)</span>}</td>
                  <td className="font-semibold">{s.nama}</td>
                  <td>{s.jk}</td>
                  <td className="font-mono text-sm">{`${s.tglLahir.slice(6)}-${s.tglLahir.slice(4, 6)}-${s.tglLahir.slice(0, 4)}`}</td>
                  {gantiPasswordAktif && (
                    <td>
                      <TombolResetPassword tipe="SISWA" id={s.id} nama={s.nama} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'guru' && (
          <table className="tabel">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Jenis nomor</th>
                <th>Nomor induk</th>
                <th>Penugasan</th>
                {resetGuru && <th>Password</th>}
              </tr>
            </thead>
            <tbody>
              {guru.map((g) => (
                <tr key={g.id}>
                  <td className="font-semibold">{g.nama}</td>
                  <td>{g.jenisNomor}</td>
                  <td className="font-mono text-sm">{g.nomorInduk}</td>
                  <td className="text-sm">{g.penugasan.map((p) => `${p.mapel.nama} ${p.kelas.nama}`).join(', ')}</td>
                  {resetGuru && (
                    <td>
                      <TombolResetPassword tipe="GURU" id={g.id} nama={g.nama} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'kelas' && (
          <table className="tabel">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>Tingkat</th>
                <th>Jurusan</th>
                <th>Grup</th>
                <th>Jumlah siswa</th>
              </tr>
            </thead>
            <tbody>
              {kelas.map((k) => (
                <tr key={k.id}>
                  <td className="font-semibold">{k.nama}</td>
                  <td>{k.tingkat}</td>
                  <td>{k.jurusan}</td>
                  <td>{k.grup.nama}</td>
                  <td className="angka">{k._count.siswa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
