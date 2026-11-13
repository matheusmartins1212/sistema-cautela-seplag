export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-institutional-800 text-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <p className="text-xs font-medium tracking-wide text-institutional-100">
            Governo de MT · SEPLAG
          </p>
          <p className="text-base font-semibold">Sistema de Cautela de Veículos</p>
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
