'use client';

import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Captcha, CaptchaHandle } from './Captcha';

type Props = {
  peran: 'SISWA' | 'GURU' | 'ADMIN';
  labelId: string;
  placeholderId: string;
  labelPassword: string;
  placeholderPassword: string;
  bantuan?: string;
};

export function LoginForm(p: Props) {
  const router = useRouter();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [lihat, setLihat] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const capRef = useRef<CaptchaHandle>(null);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setProses(true);
    setGalat(null);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peran: p.peran, id, password: pw, captcha, captchaId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setGalat(j.pesan ?? 'Login gagal.');
        capRef.current?.muatUlang();
        return;
      }
      router.replace(j.tujuan);
      router.refresh();
    } catch {
      setGalat('Tidak dapat terhubung ke server. Periksa koneksi Wi-Fi.');
      capRef.current?.muatUlang();
    } finally {
      setProses(false);
    }
  }

  return (
    <form onSubmit={kirim} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="id">
          {p.labelId}
        </label>
        <input
          id="id"
          className="input font-mono"
          value={id}
          onChange={(e) => setId(e.target.value.trim())}
          placeholder={p.placeholderId}
          autoComplete="username"
          inputMode={p.peran === 'ADMIN' ? 'text' : 'numeric'}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="pw">
          {p.labelPassword}
        </label>
        <div className="relative">
          <input
            id="pw"
            className="input pr-12 font-mono"
            type={lihat ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder={p.placeholderPassword}
            autoComplete="current-password"
            inputMode={p.peran === 'ADMIN' ? 'text' : 'numeric'}
            required
          />
          <button
            type="button"
            onClick={() => setLihat((v) => !v)}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:text-navy"
            aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {lihat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {p.bantuan && <p className="mt-1.5 text-xs text-slate-500">{p.bantuan}</p>}
      </div>
      <Captcha ref={capRef} nilai={captcha} onUbah={setCaptcha} onId={setCaptchaId} />
      {galat && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-700">
          {galat}
        </div>
      )}
      <button type="submit" className="btn-primer w-full" disabled={proses || !id || !pw || captcha.length < 5}>
        <LogIn className="h-4 w-4" /> {proses ? 'Memeriksa…' : 'Masuk'}
      </button>
    </form>
  );
}
