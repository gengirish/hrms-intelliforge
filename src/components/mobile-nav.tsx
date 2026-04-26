"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getMobileTabs, isActiveLink, type AccountType } from "@/lib/nav-config";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const accountType = (user?.accountType as AccountType | undefined) ?? null;
  const tabs = getMobileTabs(accountType);

  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl safe-bottom"
    >
      <ul
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActiveLink(pathname, tab.href.split("?")[0]);
          const label = tab.shortLabel ?? tab.label;
          return (
            <li key={tab.href} className="contents">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  "transition-colors duration-150 cursor-pointer touch-target",
                  active
                    ? "text-brand-300"
                    : "text-slate-300 active:text-white"
                )}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full bg-brand-500"
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-brand-400" : "text-slate-400"
                  )}
                  aria-hidden="true"
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
