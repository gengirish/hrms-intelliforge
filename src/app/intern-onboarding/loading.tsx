export default function OnboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div className="h-8 w-56 rounded-lg bg-slate-800/80 animate-pulse mx-auto" />
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-800/80 animate-pulse" />
            </div>
          ))}
          <div className="h-11 w-full rounded-lg bg-indigo-500/20 animate-pulse" />
        </div>
        <div className="flex flex-col items-center pt-2">
          <div
            className="h-7 w-7 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"
            aria-hidden
          />
          <p className="mt-2 text-xs text-slate-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}
