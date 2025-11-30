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
        'rzd-red': '#E30613', // Фирменный красный РЖД
        'rzd-white': '#FFFFFF',
        'rzd-gray': '#F5F5F5', // Светлый фон
      },
      fontFamily: {
        sans: ['Arial', 'sans-serif'],
      },
      boxShadow: {
        'red-glow': '0 0 10px rgba(227, 6, 19, 0.7)',
      },
    },
  },
  plugins: [],
}
