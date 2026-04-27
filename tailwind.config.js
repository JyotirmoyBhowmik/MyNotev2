/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#0a0a0f",
          surface: "#12121a",
        },
        electric: {
          blue: "#5b8af5",
        },
        glass: {
          border: "rgba(255, 255, 255, 0.06)",
        },
        text: {
          primary: "#f0f0f5",
          secondary: "#94a3b8",
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
