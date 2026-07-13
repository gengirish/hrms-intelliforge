"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";

export function InternshipsSearch() {
  const handleSearch = useCallback((value: string) => {
    const q = value.toLowerCase();
    document.querySelectorAll<HTMLElement>(".internships-job-card").forEach((el) => {
      const title = el.dataset.title ?? "";
      const skills = el.dataset.skills ?? "";
      const org = el.dataset.org ?? "";
      const match =
        !q || title.includes(q) || skills.includes(q) || org.includes(q);
      el.style.display = match ? "" : "none";
    });
  }, []);

  return (
    <div className="relative max-w-md mx-auto">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      <input
        type="text"
        placeholder="Search by role, skill, or company..."
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full rounded-lg bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
      />
    </div>
  );
}
