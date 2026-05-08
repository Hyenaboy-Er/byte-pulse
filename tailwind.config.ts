import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          card: '#13131a',
          elevated: '#1a1a24',
        },
        accent: {
          DEFAULT: '#ff3366',
          hover: '#ff1f55',
          glow: '#ff336622',
        },
        muted: '#7a7a8c',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        display: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      typography: {
        DEFAULT: { css: { maxWidth: 'none' } },
      },
    },
  },
  plugins: [],
};
export default config;
