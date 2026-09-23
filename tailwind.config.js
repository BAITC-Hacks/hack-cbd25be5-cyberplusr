/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#152420',
        paper: '#F6F7F4',
        panel: '#FFFFFF',
        line: '#DCE3DB',
        accent: {
          50: '#EFF5F1',
          100: '#DCEAE1',
          300: '#9AC2AC',
          500: '#2F6B4F',
          600: '#1F5A40',
          700: '#154634',
          900: '#0B2A1F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
