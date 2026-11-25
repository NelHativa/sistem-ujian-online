import Link from 'next/link';
import { Lambang } from './Logo';

export function LoginShell({
  judul,
  peranLabel,
  children,
  tautan,
}: {
  judul: string;
  peranLabel: string;
  children: React.ReactNode;
  tautan: { href: string; label: string }[];
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-b from-navy to-navy-dark p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Lambang className="h-12 w-12" />
          <div>
            <div className="font-heading text-lg font-bold">SMAS Bina Taruna</div>
            <div className="text-sm text-emas">Yayasan Pendidikan Bina Taruna Medan</div>
          </div>
        </div>
        <div className="max-w-md">
          <p className="mb-3 font-heading text-sm font-semibold uppercase tracking-widest text-emas">Sistem Ujian Online</p>
          <h1 className="font-heading text-4xl font-bold leading-tight">Ujian sekolah tanpa kertas, tertib waktu, dan tercatat.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-blue-100">
            Dapat dikerjakan dari laptop maupun HP. Waktu mengikuti jam server, setiap aktivitas selama ujian dicatat.
          </p>
        </div>
        <p className="text-xs text-blue-200">Demo fungsional · data dummy · {new Date().getFullYear()}</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-emas/10" />
      </section>
      <section className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm" data-masuk>
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Lambang className="h-11 w-11" />
            <div>
              <div className="font-heading font-bold">SMAS Bina Taruna</div>
              <div className="text-xs text-slate-500">Sistem Ujian Online</div>
            </div>
          </div>
          <span className="lencana bg-emas-light text-amber-900">{peranLabel}</span>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{judul}</h2>
          <div className="mt-6">{children}</div>
          <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-4 text-sm">
            {tautan.map((t) => (
              <Link key={t.href} href={t.href} className="text-slate-500 hover:text-navy">
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
