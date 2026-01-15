/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e8f1ff",
          100: "#cbdfff",
          200: "#9fc2ff",
          300: "#6aa1ff",
          400: "#3f7ff4",
          500: "#2465da",
          600: "#194fb2",
          700: "#143f8c",
          800: "#12356f",
          900: "#112d5c",
        },
        accent: "#f1a33f",
      },
      boxShadow: {
        glow: "0 0 30px rgba(36, 101, 218, 0.35)",
      },
    },
  },
  plugins: [],
};
