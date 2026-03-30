export default function OfferLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div className="h-8 w-52 rounded-lg bg-slate-800/80 animate-pulse mx-auto" />
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 space-y-4 animate-pulse">
          <div className="h-4 w-full rounded bg-slate-800" />
          <div className="h-4 w-5/6 rounded bg-slate-800/90" />
          <div className="h-4 w-4/6 rounded bg-slate-800/80" />
          <div className="h-32 w-full rounded-lg bg-slate-800/60 mt-4" />
          <div className="h-10 w-full rounded-lg bg-indigo-500/20" />
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
