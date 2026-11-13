/**
 * UI mostrada imediatamente ao navegar para /admin/veiculos/[id] enquanto a
 * Server Component busca dados/compila.
 */
export default function LoadingVeiculoDetalhe() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="h-7 w-40 rounded bg-gray-200" />
          <div className="h-6 w-24 rounded-md bg-gray-100" />
          <div className="h-5 w-24 rounded-full bg-gray-100" />
        </div>
        <div className="mt-2 h-4 w-64 rounded bg-gray-100" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <div className="mb-4 h-3 w-32 rounded bg-gray-200" />
          <div className="space-y-3">
            <div className="h-10 w-full rounded-md bg-gray-100" />
            <div className="h-10 w-full rounded-md bg-gray-100" />
            <div className="h-10 w-2/3 rounded-md bg-gray-100" />
          </div>
        </section>
      ))}
    </div>
  );
}
