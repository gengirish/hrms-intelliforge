"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  hiring: "Hiring",
  settings: "Settings",
  attendance: "Attendance",
  careers: "Careers",
  "intern-onboarding": "Onboarding",
  tasks: "Tasks",
  "daily-plan": "Daily plan",
  "weekly-progress": "Weekly progress",
  offer: "Offer Letter",
  "create-org": "Create Org",
  "sign-in": "Sign In",
  "sign-up": "Sign Up",
  "reset-password": "Reset Password",
};

function humanize(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  return segment
    .split("-")
    .map((part) =>
      part.length > 0 ? part[0].toUpperCase() + part.slice(1) : ""
    )
    .join(" ");
}

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  const crumbs: Crumb[] =
    items ??
    (() => {
      const segments = pathname.split("/").filter(Boolean);
      const list: Crumb[] = [{ label: "Home", href: "/" }];
      let acc = "";
      segments.forEach((seg, idx) => {
        acc += `/${seg}`;
        const isLast = idx === segments.length - 1;
        list.push({
          label: humanize(decodeURIComponent(seg)),
          href: isLast ? undefined : acc,
        });
      });
      return list;
    })();

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex items-center flex-wrap gap-1.5 text-slate-400">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-slate-600 shrink-0"
                  aria-hidden="true"
                />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors rounded px-1 -mx-1"
                >
                  {idx === 0 && (
                    <Home className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1 px-1 -mx-1",
                    isLast ? "text-white font-medium" : "text-slate-400"
                  )}
                >
                  {idx === 0 && (
                    <Home className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>{crumb.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
