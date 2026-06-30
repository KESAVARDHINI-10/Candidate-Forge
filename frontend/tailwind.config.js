/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        darkCard: '#151c2c',
        accentBlue: '#2563eb',
        accentBlueHover: '#1d4ed8',
        successGreen: '#10b981',
        warningOrange: '#f59e0b',
        borderGray: '#1e293b'
      },
      borderRadius: {
        'card': '16px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
