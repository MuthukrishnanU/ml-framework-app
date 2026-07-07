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
        axis: {
          burgundy: '#861F41',
          'burgundy-hover': '#701835',
          'burgundy-light': '#F5E6EB',
          'burgundy-dark': '#4D1225',
          grey: '#f5f6f8',
          'grey-dark': '#111827',
        }
      }
    },
  },
  plugins: [],
}
