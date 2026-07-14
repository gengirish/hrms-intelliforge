"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
  Clock,
  ClipboardSignature,
  ClipboardList,
  Settings,
  UserCircle,
  Wallet,
  UserPlus,
  ChevronDown,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export const ADMIN_TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Interns", icon: LayoutDashboard },
  { href: "/dashboard/attendance", label: "Attendance", icon: Clock },
  {
    href: "/dashboard/weekly-progress",
    label: "Weekly progress",
    icon: ClipboardSignature,
  },
  {
    href: "/dashboard/tasks",
    label: "Weekly tasks",
    icon: ClipboardList,
  },
  { href: "/dashboard/mentor-profile", label: "Mentor profile", icon: UserCircle },
  { href: "/dashboard/mentors/import", label: "Import mentor", icon: UserPlus },
  { href: "/dashboard/hiring", label: "Hiring", icon: Briefcase },
  { href: "/dashboard/marketplace", label: "Platform fees", icon: Wallet },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isTabActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSubnav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMentorOnly =
    user?.accountType === "admin" && user?.orgAdminRole === "MENTOR";
  const tabs = isMentorOnly
    ? ADMIN_TABS.filter(
        (t) =>
          t.href !== "/dashboard/hiring" &&
          t.href !== "/dashboard/settings" &&
          t.href !== "/dashboard/marketplace" &&
          t.href !== "/dashboard/mentors/import"
      )
    : ADMIN_TABS;

  const activeTab = tabs.find((tab) => isTabActive(pathname, tab.href)) ?? tabs[0];

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        aria-controls="dashboard-sections-nav"
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/40 px-3 py-2.5 text-left transition-colors lg:hidden",
          "hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        )}
      >
        <PanelLeft className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Dashboard sections
          </span>
          <span className="block truncate text-sm font-medium text-white">
            {activeTab?.label ?? "Navigate"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            mobileOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <nav
        id="dashboard-sections-nav"
        aria-label="Dashboard sections"
        className={cn(
          "flex-col gap-0.5 rounded-xl border border-slate-700/80 bg-slate-900/40 p-1.5",
          "lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:flex",
          mobileOpen ? "flex" : "hidden lg:flex"
        )}
      >
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "justify-start lg:justify-center lg:px-2 xl:justify-start xl:px-3",
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate lg:hidden xl:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
