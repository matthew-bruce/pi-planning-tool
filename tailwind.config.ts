import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        royalRed: '#EE2722',
        royalYellow: '#FDDD1C',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        neutral: '#6b7280',
        surface: '#ffffff',
        surfaceSubtle: '#f9fafb',
        border: '#e5e7eb',
        textPrimary: '#111827',
        textMuted: '#6b7280',
        vs1: '#fce7e7',
        vs2: '#fef9c3',
        vs3: '#ffedd5',
        vs4: '#fce7f3',
        vs5: '#fef3c7',
        vs6: '#f0fdf4',
        vs7: '#f0f9ff',
        vs8: '#f5f3ff',
      },
    },
  },
  plugins: [],
};

export default config;
