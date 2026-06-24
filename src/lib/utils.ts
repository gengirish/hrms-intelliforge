import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function formatDateIST(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTimeIST(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCurrentISOWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor(
    (now.getTime() - jan1.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function getISTDate(): Date {
  const now = new Date();
  return new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

/** UTC instant for 00:00:00 on the current calendar day in Asia/Kolkata. */
export function getISTStartOfDay(reference = new Date()): Date {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(reference.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export function getISTDayKey(reference = new Date()): string {
  return reference.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "OFFERED":
      return "bg-blue-100 text-blue-800";
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800";
    case "COMPLETED":
      return "bg-purple-100 text-purple-800";
    case "TODO":
      return "bg-slate-100 text-slate-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "DONE":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-800";
  }
}
