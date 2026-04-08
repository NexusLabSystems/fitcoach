/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#FFF3EE",
          100: "#FFE0D0",
          200: "#FFB899",
          300: "#FF8A5C",
          400: "#FF6633",
          500: "#FF5722", // Energy Orange — primary
          600: "#E64A19", // Deep Burn
          700: "#BF360C",
          800: "#8C2000",
          900: "#5C1200",
        },
        surface: {
          DEFAULT: "#1A1A2E", // Night Black
          muted:   "#16213E", // Surface Dark
          card:    "#0F3460",
        },
        accent: {
          teal:   "#00D4AA", // Recovery
          gold:   "#FFD600", // PR / Gamificação
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
        brand: "0 4px 20px -2px rgba(255,87,34,0.25)",
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