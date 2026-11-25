export function ringkasPerangkat(ua: string | null | undefined): string {
  if (!ua) return 'Tidak diketahui';
  let os = 'Lainnya';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  let br = 'Browser';
  if (/Edg\//i.test(ua)) br = 'Edge';
  else if (/SamsungBrowser/i.test(ua)) br = 'Samsung Internet';
  else if (/Firefox\//i.test(ua)) br = 'Firefox';
  else if (/Chrome\//i.test(ua) || /CriOS/i.test(ua)) br = 'Chrome';
  else if (/Safari\//i.test(ua)) br = 'Safari';
  const hp = /Mobi|Android|iPhone/i.test(ua) ? 'HP' : 'Laptop/PC';
  return `${hp} · ${os} · ${br}`;
}
