import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          bg: "#0F1115",
          surface: "#1A1D23",
          surface2: "#22262E",
          border: "#2C3038",
        },
        ink: {
          DEFAULT: "#F5F5F0",
          muted: "#9CA3AF",
          faint: "#5B6270",
        },
        amber: {
          DEFAULT: "#F0A500",
          light: "#FFC94D",
          dark: "#B87700",
        },
        status: {
          pendente: "#64748B",
          agendado: "#F0A500",
          concluido: "#22C55E",
          atrasado: "#EF4444",
        },
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        ticket: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
