import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#F4F5F7",
          surface: "#FFFFFF",
          surface2: "#F8FAFC",
          border: "#D9DEE8",
        },
        ink: {
          DEFAULT: "#14171F",
          muted: "#667085",
          faint: "#98A2B3",
        },
        amber: {
          DEFAULT: "#F4C400",
          light: "#FFD83D",
          dark: "#8A5B00",
        },
        status: {
          pendente: "#64748B",
          agendado: "#D99A00",
          concluido: "#15A36D",
          atrasado: "#DC2626",
        },
      },
      fontFamily: {
        display: ["var(--font-inter)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        ticket: "8px",
      },
    },
  },
  plugins: [],
};
export default config;
