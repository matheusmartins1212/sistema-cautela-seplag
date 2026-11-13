export default function LoadingCautelaDetalhe() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="mt-2 flex items-center gap-3">
          <div className="h-6 w-56 rounded bg-gray-200" />
          <div className="h-5 w-28 rounded-full bg-gray-100" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="rounded-card border border-gray-200 bg-white p-6 shadow-card">
          <div className="mb-4 h-3 w-32 rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j}>
                <div className="h-3 w-20 rounded bg-gray-200" />
                <div className="mt-1 h-4 w-36 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
