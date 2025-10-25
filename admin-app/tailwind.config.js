/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004E89',
        secondary: '#FF6B35',
        accent: '#F7B32B',
        background: '#F5F5F5',
        text: '#1A1A1A',
        adminDark: '#003459',
      },
    },
  },
  plugins: [],
};
