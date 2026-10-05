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
        math: {
          implies: '#3b82f6',
          equivalent: '#10b981',
          notimplies: '#ef4444',
          node: '#6366f1',
          compound: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}
