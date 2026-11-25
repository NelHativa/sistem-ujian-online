import { NextResponse } from 'next/server';
import { buatCaptcha } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  const c = await buatCaptcha();
  return NextResponse.json(c, { headers: { 'Cache-Control': 'no-store' } });
}
