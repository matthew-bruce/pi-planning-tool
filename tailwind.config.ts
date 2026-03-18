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
        vs1: '#dbeafe',
        vs2: '#dcfce7',
        vs3: '#fef9c3',
        vs4: '#fce7f3',
        vs5: '#ede9fe',
        vs6: '#ffedd5',
        vs7: '#cffafe',
        vs8: '#f1f5f9',
      },
    },
  },
  plugins: [],
};

export default config;
