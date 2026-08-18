import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#090D16",
        card: "#0F172A",
        electric: "#8B5CF6",
        neon: "#3B82F6",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(139, 92, 246, 0.35)",
        "glow-blue": "0 0 24px rgba(59, 130, 246, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;