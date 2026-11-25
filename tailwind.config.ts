import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1E3A8A', dark: '#0F2557', light: '#E8EDF8' },
        emas: { DEFAULT: '#D4A017', light: '#FBF3DC' },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
