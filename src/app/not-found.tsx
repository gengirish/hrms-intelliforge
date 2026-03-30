import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <p className="text-xs font-medium text-indigo-400 tracking-wide uppercase mb-4">
        IntelliForge HRMS
      </p>
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
        Page not found
      </h1>
      <p className="mt-4 text-slate-400 max-w-md text-sm sm:text-base">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
      >
        Back to home
      </Link>
    </div>
  );
}
