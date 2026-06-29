import { addMinutes } from "date-fns";

export const SCHEDULING_TIMEZONE = "Asia/Kolkata";

/** Combine YYYY-MM-DD + HH:mm as an instant in Asia/Kolkata (UTC+5:30). */
export function istDateTimeToUtc(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00+05:30`);
}

/** Default 45-minute interview slot ending at start + duration. */
export function defaultInterviewEnd(
  start: Date,
  durationMinutes = 45
): Date {
  return addMinutes(start, durationMinutes);
}

export function formatIstDateInput(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: SCHEDULING_TIMEZONE });
}

export function formatIstTimeInput(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    timeZone: SCHEDULING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
