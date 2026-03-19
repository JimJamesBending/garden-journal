import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Dark botanical palette
        moss: {
          50: "#f0f5f0",
          100: "#d4e4d4",
          200: "#a8c9a8",
          300: "#7cae7c",
          400: "#4a8a4a",
          500: "#2d6b2d",
          600: "#1e4d1e",
          700: "#163a16",
          800: "#0f2a0f",
          900: "#0a1f0a",
          950: "#051205",
        },
        parchment: {
          50: "#fefdfb",
          100: "#fdf8f0",
          200: "#f5ead6",
          300: "#e8d5b0",
          400: "#d4b87a",
          500: "#c4a05a",
          600: "#a07a3a",
          700: "#7a5c2a",
          800: "#5a4220",
          900: "#3d2d16",
        },
        earth: {
          50: "#faf6f2",
          100: "#f0e6d8",
          200: "#dcc8a8",
          300: "#c4a478",
          400: "#a8804a",
          500: "#8a6638",
          600: "#6e502c",
          700: "#543c22",
          800: "#3c2a18",
          900: "#281c10",
        },
        night: {
          50: "#f2f4f4",
          100: "#d8dede",
          200: "#b0bcbc",
          300: "#889a9a",
          400: "#607878",
          500: "#3d5252",
          600: "#2a3a3a",
          700: "#1e2c2c",
          800: "#141e1e",
          900: "#0c1414",
          950: "#060c0c",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
