import type { LucideIcon } from "lucide-react";
import {
  Home,
  UserPlus,
  Clock,
  ClipboardList,
  BookOpen,
  FileSignature,
  LayoutDashboard,
  Briefcase,
  Settings,
  Bell,
  Sparkles,
  Info,
} from "lucide-react";

export type AccountType = "admin" | "intern";

export interface NavItem {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  description?: string;
  audience: Array<AccountType | "public">;
  group: "primary" | "self-service" | "admin";
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    description: "Portal home",
    audience: ["public", "intern", "admin"],
    group: "primary",
  },
  {
    href: "/careers",
    label: "Careers",
    icon: Sparkles,
    description: "Open roles at IntelliForge",
    audience: ["public", "intern", "admin"],
    group: "primary",
  },
  {
    href: "/about",
    label: "About",
    icon: Info,
    description: "About IntelliForge HRMS, parent company & founder",
    audience: ["public", "intern", "admin"],
    group: "primary",
  },
  {
    href: "/intern-onboarding",
    label: "Onboarding",
    shortLabel: "Onboard",
    icon: UserPlus,
    description: "Submit your details and documents",
    audience: ["intern"],
    group: "self-service",
  },
  {
    href: "/attendance",
    label: "Attendance",
    shortLabel: "Attend",
    icon: Clock,
    description: "Punch in / out, mark WFH or office",
    audience: ["intern"],
    group: "self-service",
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: ClipboardList,
    description: "Submit weekly task logs",
    audience: ["intern"],
    group: "self-service",
  },
  {
    href: "/weekly-progress",
    label: "Weekly progress",
    shortLabel: "Progress",
    icon: BookOpen,
    description: "Accomplishments, learning, and challenges by week",
    audience: ["intern"],
    group: "self-service",
  },
  {
    href: "/offer",
    label: "Offer Letter",
    shortLabel: "Offer",
    icon: FileSignature,
    description: "View and accept your offer",
    audience: ["intern"],
    group: "self-service",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Manage interns and notifications",
    audience: ["admin"],
    group: "admin",
  },
  {
    href: "/dashboard/hiring",
    label: "Hiring",
    icon: Briefcase,
    description: "Job postings and candidates",
    audience: ["admin"],
    group: "admin",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    description: "Workspace and billing settings",
    audience: ["admin"],
    group: "admin",
  },
];

export const NOTIFICATIONS_ITEM: NavItem = {
  href: "/dashboard?tab=notifications",
  label: "Notifications",
  icon: Bell,
  description: "View notification history",
  audience: ["admin"],
  group: "admin",
};

export function getVisibleNav(
  accountType: AccountType | null | undefined,
  orgAdminRole?: "ADMIN" | "MENTOR" | null
): NavItem[] {
  const audience: Array<AccountType | "public"> = accountType
    ? ["public", accountType]
    : ["public"];
  return NAV_ITEMS.filter((item) => {
    if (!item.audience.some((a) => audience.includes(a))) return false;
    if (
      accountType === "admin" &&
      orgAdminRole === "MENTOR" &&
      (item.href === "/dashboard/hiring" || item.href === "/dashboard/settings")
    ) {
      return false;
    }
    return true;
  });
}

export function getMobileTabs(
  accountType: AccountType | null | undefined,
  orgAdminRole?: "ADMIN" | "MENTOR" | null
): NavItem[] {
  if (accountType === "admin") {
    const base = [
      NAV_ITEMS.find((i) => i.href === "/")!,
      NAV_ITEMS.find((i) => i.href === "/dashboard")!,
      NAV_ITEMS.find((i) => i.href === "/dashboard/hiring")!,
      NAV_ITEMS.find((i) => i.href === "/dashboard/settings")!,
      NOTIFICATIONS_ITEM,
    ];
    if (orgAdminRole === "MENTOR") {
      return base.filter(
        (i) => i.href !== "/dashboard/hiring" && i.href !== "/dashboard/settings"
      );
    }
    return base;
  }
  return [
    NAV_ITEMS.find((i) => i.href === "/")!,
    NAV_ITEMS.find((i) => i.href === "/intern-onboarding")!,
    NAV_ITEMS.find((i) => i.href === "/attendance")!,
    NAV_ITEMS.find((i) => i.href === "/tasks")!,
    NAV_ITEMS.find((i) => i.href === "/weekly-progress")!,
    NAV_ITEMS.find((i) => i.href === "/offer")!,
  ];
}

export function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href.includes("?")) {
    const base = href.split("?")[0];
    return pathname === base;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
