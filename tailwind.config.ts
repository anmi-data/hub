import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        anmi: {
          bg: '#031926',
          surface: '#0f2c42',
          muted: '#96a8b9',
          accent: '#74c7f4',
          border: '#2d4d63'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
