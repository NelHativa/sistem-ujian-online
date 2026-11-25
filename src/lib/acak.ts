// Pengacakan opsi yang deterministik per siswa (SOAL-10): urutan sama setiap kali dimuat ulang.

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function acakDeterministik<T>(items: T[], seed: number, salt: number): T[] {
  const rnd = mulberry32((seed ^ Math.imul(salt + 1, 2654435761)) >>> 0);
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function seedAcak() {
  return Math.floor(Math.random() * 2 ** 31);
}
