/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        "bg-2": "#111118",
        "bg-3": "#16161f",
        accent: "#5b8af5",
        purple: "#8b5cf6",
        green: "#34d399",
        red: "#f87171",
        orange: "#fb923c",
        yellow: "#fbbf24",
      },
    },
  },
  plugins: [],
}
