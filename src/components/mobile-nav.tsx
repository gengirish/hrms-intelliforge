"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UserPlus,
  Clock,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/intern-onboarding", icon: UserPlus, label: "Onboard" },
  { href: "/attendance", icon: Clock, label: "Attend" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Admin" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl safe-bottom"
    >
      <ul className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
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
                <tab.icon
                  className={cn(
                    "h-5 w-5",
                    active ? "text-brand-400" : "text-slate-400"
                  )}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
