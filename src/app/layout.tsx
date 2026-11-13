import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sistema de Cautela de Veículos — SEPLAG-MT",
    template: "%s · Cautela de Veículos — SEPLAG-MT",
  },
  description:
    "Plataforma institucional de cautela e agendamento de veículos oficiais — SEPLAG-MT.",
  robots: { index: false, follow: false }, // sistema interno: não indexar
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#173d8f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
