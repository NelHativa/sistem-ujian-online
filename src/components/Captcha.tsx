'use client';

import { RefreshCw } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type CaptchaHandle = { muatUlang: () => void; id: string | null };

type Props = { nilai: string; onUbah: (v: string) => void; onId: (id: string | null) => void };

export const Captcha = forwardRef<CaptchaHandle, Props>(function Captcha({ nilai, onUbah, onId }, ref) {
  const [svg, setSvg] = useState<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  const permintaan = useRef(0);
  const muat = useCallback(async () => {
    const ke = ++permintaan.current;
    setSvg(null);
    onUbah('');
    try {
      const r = await fetch('/api/captcha', { cache: 'no-store' });
      const j = await r.json();
      if (ke !== permintaan.current) return;
      setSvg(j.svg);
      setId(j.id);
      onId(j.id);
    } catch {
      setSvg(null);
    }
  }, [onId, onUbah]);

  const dimuat = useRef(false);
  useEffect(() => {
    if (dimuat.current) return;
    dimuat.current = true;
    muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({ muatUlang: muat, id }), [muat, id]);

  return (
    <div>
      <label className="label" htmlFor="captcha">
        Captcha
      </label>
      <div className="flex items-center gap-2">
        <div className="flex h-[56px] w-[170px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {svg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="Kode captcha" width={170} height={56} draggable={false} />
          ) : (
            <span className="text-xs text-slate-400">Memuat…</span>
          )}
        </div>
        <button type="button" onClick={muat} className="btn-garis h-[44px] w-[44px] px-0" aria-label="Ganti captcha">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <input
        id="captcha"
        className="input mt-2 font-mono uppercase tracking-[0.3em]"
        value={nilai}
        onChange={(e) => onUbah(e.target.value.toUpperCase())}
        placeholder="Ketik kode di atas"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={5}
        required
      />
    </div>
  );
});
