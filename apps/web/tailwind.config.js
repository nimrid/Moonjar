/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFFDF8',
        ink: '#1F1B2E',
        sun: {
          light: '#FFF3D6',
          DEFAULT: '#FFD15C',
          dark: '#F59E0B',
        },
        grape: {
          light: '#EDE9FE',
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
        },
        leaf: {
          light: '#D1FAE5',
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        'slate-cool': {
          light: '#F8FAFC',
          DEFAULT: '#64748B',
          dark: '#334155',
        },
        sky: {
          light: '#E0F2FE',
          DEFAULT: '#38BDF8',
          dark: '#0284C7',
        },
        rose: {
          light: '#FFE4E6',
          DEFAULT: '#F43F5E',
          dark: '#E11D48',
        },
      },
      boxShadow: {
        sticker: '4px 4px 0px #1F1B2E',
        'sticker-sm': '2px 2px 0px #1F1B2E',
        'sticker-lg': '6px 6px 0px #1F1B2E',
        'sticker-xl': '8px 8px 0px #1F1B2E',
        'sticker-pressed': '1px 1px 0px #1F1B2E',
        'sticker-none': '0px 0px 0px #1F1B2E',
      },
      borderWidth: {
        '3': '3px',
      },
      fontFamily: {
        display: ['var(--font-fredoka)', 'system-ui', 'sans-serif'],
        body: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        numbers: ['var(--font-atkinson)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
