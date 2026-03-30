export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="h-8 w-48 rounded-lg bg-slate-800/80 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-xl border border-slate-800 bg-slate-900/50 animate-pulse" />
      </div>
      <div className="flex flex-col items-center justify-center py-12">
        <div
          className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"
          aria-hidden
        />
        <p className="mt-3 text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
