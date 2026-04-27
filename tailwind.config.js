/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        accent: '#ff6b6b',
        background: '#0a0a0a',
        surface: '#141414',
        'surface-2': '#1a1a1a',
        border: '#2a2a2a',
        'text-primary': '#f0f0f0',
        'text-secondary': '#888888',
        'text-muted': '#555555',
        success: '#4ade80',
        warning: '#fb923c',
        danger: '#f87171',
      },
      borderColor: {
        DEFAULT: '#2a2a2a',
      },
      backgroundColor: {
        DEFAULT: '#0a0a0a',
      },
    },
  },
  plugins: [],
}
