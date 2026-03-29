"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserPlus, Clock, ClipboardList, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/onboard", icon: UserPlus, label: "Onboard" },
  { href: "/attendance", icon: Clock, label: "Attend" },
  { href: "/tasks", icon: ClipboardList, label: "Tasks" },
  { href: "/dashboard", icon: LayoutDashboard, label: "Admin" },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active
                  ? "text-indigo-400"
                  : "text-slate-500 active:text-slate-300"
              )}
            >
              <tab.icon className={cn("h-5 w-5", active && "text-indigo-400")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
