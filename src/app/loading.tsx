export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-4">
      <div
        className="h-10 w-10 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin"
        aria-hidden
      />
      <p className="mt-4 text-sm text-slate-400">Loading...</p>
    </div>
  );
}
