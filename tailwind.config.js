/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#F0F4F2",
          100: "#D6E4DC",
          200: "#B8CEC6",
          300: "#8EA588", // Sage Green
          400: "#6A8A82",
          500: "#3E564F", // Medium Dark — primary
          600: "#324540",
          700: "#263530",
          800: "#1E2A25",
          900: "#183729", // Deep Dark Green
        },
        surface: {
          DEFAULT: "#183729",
          muted:   "#263530",
          card:    "#3E564F",
        },
        accent: {
          sage:  "#8EA588", // Sage Green
          light: "#EBEBEB", // Light Gray
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        brand: "0 4px 20px -2px rgba(62,86,79,0.25)",
        card:  "0 1px 4px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in":    "fadeIn 0.2s ease-out",
        "slide-up":   "slideUp 0.25s ease-out",
        "scale-in":   "scaleIn 0.15s ease-out",
        "spin-slow":  "spin 2s linear infinite",
      },
      keyframes: {
        fadeIn:  { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
      },
    },
  },
  plugins: [],
};