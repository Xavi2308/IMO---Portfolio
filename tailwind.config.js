/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Usar clase 'dark' para modo oscuro
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'theme': 'var(--theme-color)',
        'theme-main': 'var(--theme-main)',
        'theme-c1': 'var(--theme-c1)',
        'theme-c2': 'var(--theme-c2)',
        'theme-c3': 'var(--theme-c3)',
        'theme-c4': 'var(--theme-c4)',
        'theme-c5': 'var(--theme-c5)',
        'theme-hover': 'var(--theme-color-hover)',
        'secondary-1': 'var(--theme-secondary-1)',
        'secondary-2': 'var(--theme-secondary-2)',
        'secondary-3': 'var(--theme-secondary-3)',
        'secondary-4': 'var(--theme-secondary-4)',
        'background': 'var(--background)',
        'background-secondary': 'var(--background-secondary)',
        'card': 'var(--card)',
        'text': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'text-inverted': 'var(--text-inverted)',
        'border': 'var(--border)',
        'shadow': 'var(--shadow)',
        'hover-bg': 'var(--hover-bg)',
        'pear-yellow': {
          DEFAULT: '#FFCA28',
          dark: '#D4A017',
        },
      },
    },
  },
  variants: {
    extend: {
      display: ['group-hover'],
    },
  },
  plugins: [],
}