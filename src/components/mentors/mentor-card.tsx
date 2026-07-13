import Link from "next/link";
import { ArrowRight, Star, Crown, IndianRupee } from "lucide-react";

export interface MentorListing {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  bio: string | null;
  expertise: string[];
  yearsExperience: number | null;
  avatarUrl: string | null;
  hourlyRatePaise: number | null;
  isPremium: boolean;
  avgRating: number;
  ratingCount: number;
  orgName: string;
}

function formatRate(paise: number | null): string | null {
  if (paise == null || paise <= 0) return null;
  const rupees = paise / 100;
  return rupees >= 1000 ? `₹${(rupees / 1000).toFixed(1)}k/hr` : `₹${rupees}/hr`;
}

export function MentorCard({ mentor }: { mentor: MentorListing }) {
  const rate = formatRate(mentor.hourlyRatePaise);

  return (
    <Link
      href={`/mentors/${mentor.slug}`}
      className="glass-card p-6 block hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all group mentor-card"
      data-name={mentor.name.toLowerCase()}
      data-headline={(mentor.headline ?? "").toLowerCase()}
      data-expertise={mentor.expertise.map((e) => e.toLowerCase()).join(",")}
    >
      <div className="flex items-start gap-4">
        {mentor.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mentor.avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover border border-slate-700 shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-lg font-semibold text-indigo-300 shrink-0">
            {mentor.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition-colors">
              {mentor.name}
            </h2>
            {mentor.isPremium && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                <Crown className="h-3 w-3" />
                Premium
              </span>
            )}
          </div>

          {mentor.headline && (
            <p className="text-sm text-indigo-300/90 mb-2 line-clamp-1">
              {mentor.headline}
            </p>
          )}

          {mentor.bio && (
            <p className="text-sm text-slate-400 line-clamp-2 mb-3">
              {mentor.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
            <span>{mentor.orgName}</span>
            {mentor.yearsExperience != null && mentor.yearsExperience > 0 && (
              <span>{mentor.yearsExperience}+ yrs exp</span>
            )}
            {mentor.ratingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-400/90">
                <Star className="h-3 w-3 fill-amber-400/90" />
                {mentor.avgRating.toFixed(1)} ({mentor.ratingCount})
              </span>
            )}
            {rate && (
              <span className="inline-flex items-center gap-0.5 text-emerald-400/80">
                <IndianRupee className="h-3 w-3" />
                {rate.replace("₹", "")}
              </span>
            )}
          </div>

          {mentor.expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {mentor.expertise.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                >
                  {skill}
                </span>
              ))}
              {mentor.expertise.length > 5 && (
                <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">
                  +{mentor.expertise.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  );
}
