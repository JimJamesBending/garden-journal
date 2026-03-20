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
        // High-contrast outdoor-optimised palette
        garden: {
          white: "#FFFFFF",
          cream: "#FEFEF2",
          offwhite: "#F5F5F0",
          text: "#1A1A1A",
          textMuted: "#4A4A4A",
          green: "#1B5E20",
          greenBright: "#2E7D32",
          greenLight: "#E8F5E9",
          border: "#C8E6C9",
          amber: "#F57F17",
          red: "#C62828",
          blue: "#1565C0",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "body-lg": ["20px", { lineHeight: "1.6" }],
        body: ["18px", { lineHeight: "1.6" }],
        "body-sm": ["16px", { lineHeight: "1.5" }],
        label: ["14px", { lineHeight: "1.4" }],
        "heading-lg": ["36px", { lineHeight: "1.2", fontWeight: "700" }],
        heading: ["28px", { lineHeight: "1.3", fontWeight: "700" }],
        "heading-sm": ["22px", { lineHeight: "1.3", fontWeight: "600" }],
        button: ["20px", { lineHeight: "1", fontWeight: "600" }],
      },
    },
  },
  plugins: [],
};
export default config;
