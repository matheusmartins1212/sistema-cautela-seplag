export default function LoadingChecklist() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-7 w-72 rounded bg-gray-200" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-7 w-32 rounded bg-gray-100" />
        ))}
      </div>
      <div className="space-y-4 rounded-card border border-gray-200 bg-white p-6 shadow-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="h-11 w-full rounded-md bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
