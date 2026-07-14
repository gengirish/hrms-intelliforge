"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { MentorCard, type MentorListing } from "@/components/mentors/mentor-card";
import { MentorSearch } from "@/components/mentors/mentor-search";

interface MentorsResponse {
  mentors: MentorListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  profileCount?: number;
  publicCount?: number;
}

interface MentorDirectoryProps {
  initialData: MentorsResponse;
  expertiseOptions: string[];
}

export function MentorDirectory({
  initialData,
  expertiseOptions,
}: MentorDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const page = data.page;
  const expertise = searchParams.get("expertise") ?? "";
  const profileCount = data.profileCount ?? 0;
  const publicCount = data.publicCount ?? data.total;
  const hasUnpublishedOnly =
    data.mentors.length === 0 && profileCount > 0 && publicCount === 0;

  function handleExpertiseChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("expertise", value);
    } else {
      params.delete("expertise");
    }
    params.delete("page");
    router.push(`/mentors?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`/mentors?${params.toString()}`);
  }

  return (
    <>
      <MentorSearch
        expertiseOptions={expertiseOptions}
        onExpertiseChange={handleExpertiseChange}
      />

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pb-24 mt-12">
        {data.mentors.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            {hasUnpublishedOnly ? (
              <>
                <p className="text-slate-300 font-medium mb-2">
                  Mentors exist but none are listed yet
                </p>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                  {profileCount} mentor profile{profileCount !== 1 ? "s are" : " is"}{" "}
                  hidden from this directory. Mentors can turn on{" "}
                  <span className="text-slate-300">Program directory</span> in their
                  profile, or an org admin can publish everyone from the dashboard.
                </p>
                <Link
                  href="/dashboard/mentors/import"
                  className="inline-flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Publish mentors
                </Link>
              </>
            ) : expertise ? (
              <p className="text-slate-400">
                No mentors found for this filter. Try a different skill or clear the
                filter.
              </p>
            ) : (
              <p className="text-slate-400">
                No mentors found. Try a different filter or check back soon!
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {data.total} mentor{data.total !== 1 ? "s" : ""} available
              {expertise ? ` · filtered by ${expertise}` : ""}
            </p>
            <div className="space-y-4">
              {data.mentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages}
                  onClick={() => goToPage(page + 1)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
