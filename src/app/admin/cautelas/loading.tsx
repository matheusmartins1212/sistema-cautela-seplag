export default function LoadingAdminCautelas() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-32 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-md bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-gray-100 px-4 py-3 last:border-b-0"
          >
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-32 rounded bg-gray-100" />
            <div className="h-4 w-28 rounded bg-gray-100" />
            <div className="h-4 w-36 rounded bg-gray-100" />
            <div className="ml-auto h-5 w-24 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
