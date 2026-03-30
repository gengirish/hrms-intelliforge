export default function TasksLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="h-7 w-40 rounded-lg bg-slate-800/80 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4 animate-pulse"
          >
            <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 max-w-md rounded bg-slate-800" />
              <div className="h-3 w-1/2 max-w-xs rounded bg-slate-800/70" />
            </div>
          </div>
        ))}
        <div className="flex flex-col items-center pt-6">
          <div
            className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"
            aria-hidden
          />
          <p className="mt-3 text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}
