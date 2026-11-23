import Image from "next/image";
import brasao from "@/assets/brasao-mt.png";
import { env } from "@/server/config/env";

const FEATURES = [
  "Pedido de veículo on-line, com ou sem condutor",
  "A central define o veículo e, se pedido, o condutor",
  "Checklist de saída e retorno com fotos",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 lg:flex-row">
      {/* Painel institucional: compacto no celular, metade da tela no desktop */}
      <aside className="relative overflow-hidden bg-gradient-to-br from-institutional-950 via-institutional-900 to-institutional-800 text-white lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:px-14 lg:py-12">
        {/* Marca d'água decorativa */}
        <Image
          src={brasao}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-24 hidden w-[28rem] max-w-none opacity-[0.06] lg:block"
        />

        <div className="relative flex items-center gap-4 px-5 py-4 lg:block lg:p-0">
          <Image
            src={brasao}
            alt="Brasão do Estado de Mato Grosso"
            priority
            className="h-12 w-auto shrink-0 lg:h-28"
          />
          <div className="lg:mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-institutional-200 lg:text-sm">
              SEPLAG / SATGF
            </p>
            <h1 className="text-base font-semibold leading-tight lg:mt-2 lg:text-4xl lg:font-bold">
              Central de Veículos Compartilhados
            </h1>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <p className="max-w-md text-lg leading-relaxed text-institutional-100">
            Frota oficial compartilhada entre os órgãos, do pedido de transporte ao retorno do
            veículo.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-institutional-50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <CheckIcon />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden text-sm text-institutional-200 lg:block">
          Governo de Mato Grosso · Secretaria de Estado de Planejamento e Gestão
        </p>
      </aside>

      <div className="flex flex-1 flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card sm:p-8">
              {children}
            </div>
          </div>
        </main>

        <footer className="space-y-1 px-6 pb-6 text-center text-xs text-gray-500">
          <p>Uso restrito e auditado · Acesso exclusivo a servidores autorizados.</p>
          <p>
            Governo de Mato Grosso · SEPLAG / SATGF
            {env.SUPPORT_CONTACT ? ` · Suporte: ${env.SUPPORT_CONTACT}` : ""}
          </p>
        </footer>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 10.5 3.2 3L15 7" />
    </svg>
  );
}
