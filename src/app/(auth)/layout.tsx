import Image from "next/image";
import brasao from "@/assets/brasao-mt.png";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-institutional-800 text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Image
            src={brasao}
            alt="Brasão do Estado de Mato Grosso"
            priority
            className="h-12 w-auto shrink-0"
          />
          <div>
            <p className="text-xs font-medium tracking-wide text-institutional-100">
              SEPLAG / SATGF
            </p>
            <p className="text-base font-semibold">Sistema de Cautela de Veículos</p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-card border border-gray-200 bg-white p-6 shadow-card sm:p-8">
            {children}
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            Uso restrito e auditado · Acesso exclusivo a servidores autorizados.
          </p>
        </div>
      </main>
    </div>
  );
}
