"use client";

import { useCallback } from "react";
import { Search } from "lucide-react";

interface MentorSearchProps {
  expertiseOptions?: string[];
  onExpertiseChange?: (value: string) => void;
}

export function MentorSearch({
  expertiseOptions = [],
  onExpertiseChange,
}: MentorSearchProps) {
  const handleSearch = useCallback((value: string) => {
    const q = value.toLowerCase();
    document.querySelectorAll<HTMLElement>(".mentor-card").forEach((el) => {
      const name = el.dataset.name ?? "";
      const headline = el.dataset.headline ?? "";
      const expertise = el.dataset.expertise ?? "";
      const match =
        !q ||
        name.includes(q) ||
        headline.includes(q) ||
        expertise.includes(q);
      el.style.display = match ? "" : "none";
    });
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name, headline, or skill..."
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full rounded-lg bg-slate-900/80 border border-slate-700 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
        />
      </div>
      {expertiseOptions.length > 0 && (
        <select
          onChange={(e) => onExpertiseChange?.(e.target.value)}
          className="rounded-lg bg-slate-900/80 border border-slate-700 px-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all"
          defaultValue=""
        >
          <option value="">All expertise</option>
          {expertiseOptions.map((exp) => (
            <option key={exp} value={exp}>
              {exp}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
