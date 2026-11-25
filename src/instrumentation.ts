export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { mulaiPenjadwal } = await import('./lib/penutupan');
    mulaiPenjadwal();
  }
}
