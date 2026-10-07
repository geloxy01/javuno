/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        javuno: {
          DEFAULT: "#3B3FF0",
          dark: "#2A2A9E",
          light: "#EEEFFE",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(42, 42, 158, 0.18)",
      },
    },
  },
  plugins: [],
};
