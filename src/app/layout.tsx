import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Central de Veículos Compartilhados — SEPLAG / SATGF",
    template: "%s · Central de Veículos — SEPLAG / SATGF",
  },
  description:
    "Central de veículos compartilhados: os órgãos solicitam o transporte e a central aciona veículo e condutor — SEPLAG / SATGF.",
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
