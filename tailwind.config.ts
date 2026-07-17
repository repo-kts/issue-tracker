import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic UI tokens — driven by CSS variables in globals.css so
        // they flip automatically between the dark and light themes.
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        panel: "var(--color-panel)",
        elevated: "var(--color-elevated)",
        border: "var(--color-border)",
        muted: "var(--color-muted)",
        text: "var(--color-text)",
        // accent / status colors read well on both themes, so they stay fixed
        accent: "#f97316",
        accentSoft: "#fed7aa",
        danger: "#ef4444",
        success: "#10b981",
        // editorial palette (used on the issue detail page)
        paper: "#efe6d3",
        "paper-soft": "#d7cdb8",
        "paper-muted": "#8c8170",
        ink: "#0c0a07",
        "ink-soft": "#16120c",
        "ink-panel": "#1c1812",
        rule: "#2b251c",
        "rule-soft": "#211c15",
        marigold: "#d99756",
        "marigold-deep": "#b56a2f",
        sage: "#7c9e6d",
        clay: "#b85a3d",
        slate: "#6a89a8",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["Newsreader", "Georgia", "serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
