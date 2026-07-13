"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const ADMIN_TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
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
  { href: "/dashboard/marketplace", label: "Marketplace", icon: Wallet },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSubnav({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
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

  return (
    <nav
      aria-label="Dashboard sections"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/40 p-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const active =
          tab.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
