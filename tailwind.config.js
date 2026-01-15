/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'kurdis': ['Kurdis', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        'sans': ['Kurdis', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        'custom-white': '#d9d9d6',
      },
    },
  },
  plugins: [],
}