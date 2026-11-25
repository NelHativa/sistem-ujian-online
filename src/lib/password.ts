export const PANJANG_MIN_PASSWORD = 8;

/** Satu-satunya aturan password baru: minimal 8 karakter. Mengembalikan pesan galat, atau null bila valid. */
export function validasiPasswordBaru(password: string): string | null {
  if (password.length < PANJANG_MIN_PASSWORD) return `Password baru minimal ${PANJANG_MIN_PASSWORD} karakter.`;
  return null;
}
