export default function AttendanceLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-lg px-4 py-10 space-y-6">
        <div className="h-7 w-44 rounded-lg bg-slate-800/80 animate-pulse mx-auto" />
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 space-y-4 animate-pulse">
          <div className="h-16 w-full rounded-lg bg-slate-800/80" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 rounded-lg bg-slate-800/80" />
            <div className="h-12 rounded-lg bg-slate-800/80" />
          </div>
          <div className="h-12 w-full rounded-lg bg-indigo-500/20" />
        </div>
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
