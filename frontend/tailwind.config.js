/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      // IMPORTANT: Tailwind is used ONLY for layout geometry (spacing, grid, flex)
      // All colors must use CSS Variables defined in styles/themes.css
    },
  },
  plugins: [],
}
