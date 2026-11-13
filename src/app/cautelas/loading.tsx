export default function LoadingMinhasCautelas() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-40 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-56 rounded bg-gray-100" />
      </div>
      <div className="h-20 rounded-card border border-gray-200 bg-white shadow-card" />
      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-gray-100 px-4 py-4 last:border-b-0"
          >
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-8 w-36 rounded bg-gray-100" />
            <div className="h-4 w-44 rounded bg-gray-100" />
            <div className="ml-auto h-5 w-24 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
