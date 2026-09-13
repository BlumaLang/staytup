/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          surface: '#121212',
          card: '#1C1C1E',
          cardHover: '#252528',
          border: '#2C2C2E',
          borderDark: '#1A1A1C',
          muted: '#8E8E93',
          lightGray: '#E5E5EA',
          white: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
