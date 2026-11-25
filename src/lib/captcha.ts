// Captcha gambar yang dibuat server sendiri (tanpa layanan internet).
import { randomBytes, randomInt } from 'crypto';
import { prisma } from './db';

const HURUF = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function buatCaptcha() {
  const kode = Array.from({ length: 5 }, () => HURUF[randomInt(HURUF.length)]).join('');
  const id = randomBytes(12).toString('hex');
  await prisma.captcha.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await prisma.captcha.create({ data: { id, jawaban: kode, expiresAt: new Date(Date.now() + 5 * 60_000) } });
  return { id, svg: gambarSvg(kode) };
}

/** Memeriksa dan langsung menghanguskan captcha (sekali pakai). */
export async function periksaCaptcha(id: unknown, jawaban: unknown) {
  if (typeof id !== 'string' || typeof jawaban !== 'string') return false;
  const c = await prisma.captcha.findUnique({ where: { id } });
  if (!c) return false;
  await prisma.captcha.delete({ where: { id } }).catch(() => undefined);
  if (c.expiresAt < new Date()) return false;
  return c.jawaban === jawaban.trim().toUpperCase();
}

function gambarSvg(kode: string) {
  const w = 170;
  const h = 56;
  const warna = ['#1E3A8A', '#0F2557', '#7C2D12', '#14532D', '#581C87'];
  let isi = '';
  for (let i = 0; i < 6; i++) {
    isi += `<line x1="${randomInt(w)}" y1="${randomInt(h)}" x2="${randomInt(w)}" y2="${randomInt(h)}" stroke="${warna[randomInt(warna.length)]}" stroke-opacity="0.35" stroke-width="${1 + randomInt(2)}"/>`;
  }
  for (let i = 0; i < 30; i++) {
    isi += `<circle cx="${randomInt(w)}" cy="${randomInt(h)}" r="${1 + randomInt(2)}" fill="#64748B" fill-opacity="0.35"/>`;
  }
  kode.split('').forEach((ch, i) => {
    const x = 18 + i * 29 + randomInt(6);
    const y = 38 + randomInt(8) - 4;
    const rot = randomInt(50) - 25;
    isi += `<text x="${x}" y="${y}" font-family="Verdana, sans-serif" font-size="${26 + randomInt(6)}" font-weight="700" fill="${warna[randomInt(warna.length)]}" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
  });
  const path = `M0 ${20 + randomInt(20)} Q ${w / 2} ${randomInt(h)} ${w} ${20 + randomInt(20)}`;
  isi += `<path d="${path}" stroke="#0F172A" stroke-opacity="0.45" stroke-width="2" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#F1F5F9"/>${isi}</svg>`;
}
