import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell() {
  return (
    <Link
      href="/dashboard?tab=notifications"
      aria-label="View notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
