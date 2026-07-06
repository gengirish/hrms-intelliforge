"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Sparkles } from "lucide-react";

function getEmbedSrc(url: string): string {
  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/
  );
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([\w-]+)/);
  if (loomMatch) {
    return `https://www.loom.com/embed/${loomMatch[1]}`;
  }

  return trimmed;
}

function DemoVideoFallback() {
  const pathname = usePathname();
  const href =
    pathname === "/" ? "#features-heading" : "/about#demo";

  return (
    <Link
      href={href}
      className="group trust-card mx-auto block max-w-4xl overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
      aria-label="Watch product tour — explore HRMS features"
    >
      <div className="relative aspect-video w-full">
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 gradient-hero opacity-30"
          aria-hidden="true"
        />

        {/* Decorative UI mock */}
        <div
          className="absolute inset-6 sm:inset-10 rounded-xl border border-white/10 bg-slate-900/60 backdrop-blur-sm shadow-2xl overflow-hidden"
          aria-hidden="true"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            <div className="ml-3 h-2 flex-1 max-w-[40%] rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 sm:p-6">
            <div className="col-span-1 space-y-2">
              <div className="h-2 w-full rounded bg-brand-500/40" />
              <div className="h-2 w-4/5 rounded bg-white/10" />
              <div className="h-2 w-3/5 rounded bg-white/10" />
              <div className="h-2 w-full rounded bg-white/10" />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
                <div className="h-2 w-1/2 rounded bg-brand-400/50 mb-2" />
                <div className="h-8 rounded bg-white/5" />
              </div>
              <div className="rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
                <div className="h-2 w-1/2 rounded bg-emerald-400/50 mb-2" />
                <div className="h-8 rounded bg-white/5" />
              </div>
              <div className="col-span-2 rounded-lg bg-white/5 p-3 ring-1 ring-white/10">
                <div className="h-2 w-1/3 rounded bg-violet-400/50 mb-2" />
                <div className="h-12 rounded bg-white/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Play overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-500/20 ring-2 ring-brand-400/50 transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-500/30">
            <Play
              className="h-9 w-9 translate-x-0.5 text-white drop-shadow-lg"
              aria-hidden="true"
              fill="currentColor"
            />
          </div>
          <div className="relative space-y-2">
            <p className="flex items-center justify-center gap-2 text-lg font-semibold text-white sm:text-xl">
              <Sparkles className="h-5 w-5 text-brand-300" aria-hidden="true" />
              Watch product tour
            </p>
            <p className="text-sm text-slate-300 max-w-sm mx-auto">
              Explore how IntelliForge HRMS runs internships end-to-end
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function DemoVideo() {
  const rawUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();

  if (rawUrl) {
    const embedSrc = getEmbedSrc(rawUrl);

    return (
      <div className="trust-card mx-auto max-w-4xl overflow-hidden rounded-2xl">
        <div className="relative aspect-video w-full">
          <iframe
            src={embedSrc}
            title="IntelliForge HRMS product demo"
            className="absolute inset-0 h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return <DemoVideoFallback />;
}
