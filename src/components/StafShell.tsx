import Link from 'next/link';
import { Lambang } from './Logo';
import { TombolKeluar } from './TombolKeluar';

export function StafShell({
  peran,
  nama,
  keterangan,
  menu,
  children,
}: {
  peran: 'GURU' | 'ADMIN';
  nama: string;
  keterangan: string;
  menu: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="bg-gradient-to-b from-navy to-navy-dark text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href={peran === 'GURU' ? '/guru/beranda' : '/admin/beranda'} className="flex items-center gap-2.5">
            <Lambang className="h-9 w-9" />
            <div className="leading-tight">
              <div className="font-heading text-sm font-bold">Ujian SMAS Bina Taruna</div>
              <div className="text-xs text-emas">{peran === 'GURU' ? 'Ruang Guru' : 'Panel Admin'}</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold">{nama}</div>
              <div className="text-xs text-blue-200">{keterangan}</div>
            </div>
            <TombolKeluar peran={peran} terang />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
          {menu.map((m) => (
            <Link key={m.href} href={m.href} className="whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium text-blue-100 hover:bg-white/10 hover:text-white">
              {m.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6" data-masuk>
        {children}
      </main>
    </div>
  );
}

export function JudulHalaman({ judul, sub, aksi }: { judul: string; sub?: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{judul}</h1>
        {sub && <div className="mt-1 text-sm text-slate-600">{sub}</div>}
      </div>
      {aksi && <div className="flex flex-wrap gap-2">{aksi}</div>}
    </div>
  );
}

export function LencanaStatusPaket({ status }: { status: string }) {
  return status === 'FINAL' ? (
    <span className="lencana bg-emerald-100 text-emerald-700">Final</span>
  ) : (
    <span className="lencana bg-amber-100 text-amber-800">Draf</span>
  );
}
