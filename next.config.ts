import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['exceljs', '@prisma/client', 'bcryptjs'],
  // Mengizinkan akses dev dari HP/laptop lain di jaringan lokal yang sama.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local'],
};

export default nextConfig;
