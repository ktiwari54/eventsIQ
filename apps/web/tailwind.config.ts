import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0E1A",
        surface: "#111827",
        card: "#1A2235",
        border: "#1E2D45",
        accent: "#3B82F6",
        gold: "#F59E0B",
        green: "#10B981",
        danger: "#EF4444",
        purple: "#8B5CF6",
        muted: "#94A3B8",
      },
    },
  },
  plugins: [],
};

export default config;
