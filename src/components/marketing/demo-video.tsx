import { Play } from "lucide-react";

function getEmbedSrc(url: string): string {
  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/,
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

  return (
    <div className="trust-card mx-auto max-w-4xl overflow-hidden rounded-2xl">
      <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-4 bg-slate-900/80 px-6 text-center">
        <div
          className="absolute inset-0 gradient-hero opacity-40"
          aria-hidden="true"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/15 ring-1 ring-inset ring-brand-500/40">
          <Play
            className="h-7 w-7 translate-x-0.5 text-brand-300"
            aria-hidden="true"
          />
        </div>
        <div className="relative space-y-2">
          <p className="text-lg font-semibold text-white">
            Watch 60-second demo
          </p>
          <p className="text-sm text-slate-400 max-w-md">
            Demo coming soon — book a walkthrough at{" "}
            <a
              href="mailto:hr@intelliforge.tech"
              className="text-brand-300 underline-offset-2 hover:text-brand-200 hover:underline"
            >
              hr@intelliforge.tech
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
