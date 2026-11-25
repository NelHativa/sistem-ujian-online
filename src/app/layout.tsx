import type { Metadata, Viewport } from 'next';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/500.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ujian SMAS Bina Taruna',
  description: 'Sistem Ujian Online SMAS Bina Taruna — demo fungsional',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1E3A8A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
