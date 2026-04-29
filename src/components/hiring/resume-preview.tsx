"use client";

import { Download, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  url: string;
  candidateName: string;
  className?: string;
}

function isPdfUrl(url: string): boolean {
  if (!url) return false;
  const withoutQuery = url.split("?")[0] ?? url;
  return withoutQuery.toLowerCase().endsWith(".pdf");
}

export function ResumePreview({
  url,
  candidateName,
  className,
}: ResumePreviewProps) {
  const pdf = isPdfUrl(url);

  return (
    <div className={cn("space-y-3", className)}>
      {pdf ? (
        <iframe
          src={url}
          title="Resume preview"
          className="w-full h-[600px] rounded-lg border border-slate-700 bg-slate-950"
        />
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 text-slate-300 shrink-0">
            <FileText className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              Resume file
            </p>
            <p className="text-xs text-slate-400 truncate">{candidateName}</p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors shrink-0"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            View
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          Open in new tab
        </a>
        <a
          href={url}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-medium text-white transition-colors"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download
        </a>
      </div>
    </div>
  );
}
