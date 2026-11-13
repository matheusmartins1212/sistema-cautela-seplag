import type { Config } from "tailwindcss";

/**
 * Tokens de design institucional SEPLAG-MT.
 * Paleta sóbria conforme PROMPT COMPLEMENTAR (UI/UX):
 * azul institucional como base, status semânticos discretos.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Azul institucional (cor principal / cabeçalho / sidebar)
        institutional: {
          50: "#eef5ff",
          100: "#d9e8ff",
          200: "#b9d4ff",
          300: "#8ab8ff",
          400: "#5592f7",
          500: "#2f6fe8", // azul vivo, ações principais
          600: "#1f58cc",
          700: "#1a48ab",
          800: "#173d8f", // barra superior
          900: "#12337a", // menu lateral
          950: "#0b2154",
        },
        // Status semânticos
        success: "#15803d",
        danger: "#b91c1c",
        warning: "#b45309",
        info: "#1d4ed8",
        neutralStatus: "#6b7280",
      },
      borderRadius: {
        card: "0.625rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
