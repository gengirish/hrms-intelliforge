import { formatINR, formatDateIST, formatTimeIST, getCurrentISOWeek } from "@/lib/utils";

interface AttendanceRecord {
  date: Date;
  punchIn: Date | null;
  punchOut: Date | null;
  mode: string;
}

interface TaskRecord {
  title: string;
  status: string;
  hours: number;
}

interface InternProfile {
  name: string;
  role: string;
  status: string;
  stipendPaise: number;
  startDate: Date;
  durationWeeks: number;
  college: string;
}

export function helpResponse(name: string): string {
  return (
    `Hi ${name}! I'm your HR assistant. Here's what I can do:\n\n` +
    `*Attendance*\n` +
    `• "Punch in" or "Punch in WFH/Office"\n` +
    `• "Punch out"\n` +
    `• "Show attendance"\n\n` +
    `*Tasks*\n` +
    `• "Log task: <title>, <hours>h"\n` +
    `• "Show tasks"\n\n` +
    `*Info*\n` +
    `• "My stipend"\n` +
    `• "My status"\n` +
    `• "Help"\n\n` +
    `Just type naturally — I'll understand!`
  );
}

export function punchInResponse(mode?: string): string {
  const modeText = mode ? ` (${mode})` : "";
  return `Attendance logged — punched in${modeText}. Have a productive day!`;
}

export function punchOutResponse(): string {
  return `Punched out for the day. Great work!`;
}

export function alreadyPunchedInResponse(): string {
  return `You've already punched in today. To punch out, just say "punch out".`;
}

export function alreadyPunchedOutResponse(): string {
  return `You've already punched out today. See you tomorrow!`;
}

export function noPunchInResponse(): string {
  return `You haven't punched in yet today. Say "punch in" first.`;
}

export function taskLoggedResponse(title: string, hours: number, status: string): string {
  const week = getCurrentISOWeek();
  return `Task logged — "${title}" (${hours}h, ${status}, Week ${week.split("-W")[1]}).`;
}

export function tasksListResponse(tasks: TaskRecord[]): string {
  if (tasks.length === 0) {
    return `No tasks logged this week. Say "log task: <title>, <hours>h" to add one.`;
  }

  const totalHours = tasks.reduce((sum, t) => sum + t.hours, 0);
  const lines = tasks.map(
    (t, i) => `${i + 1}. ${t.title} — ${t.hours}h — ${t.status}`
  );

  return (
    `*Tasks this week* (${getCurrentISOWeek()}):\n\n` +
    lines.join("\n") +
    `\n\nTotal: ${totalHours}h`
  );
}

export function attendanceListResponse(records: AttendanceRecord[]): string {
  if (records.length === 0) {
    return `No attendance records this week. Say "punch in" to get started.`;
  }

  const lines = records.map((r) => {
    const date = formatDateIST(r.date);
    const inTime = r.punchIn ? formatTimeIST(r.punchIn) : "—";
    const outTime = r.punchOut ? formatTimeIST(r.punchOut) : "—";
    return `${date}: ${inTime} → ${outTime} (${r.mode})`;
  });

  return `*Attendance this week:*\n\n` + lines.join("\n") + `\n\nDays: ${records.length}`;
}

export function stipendResponse(intern: InternProfile): string {
  return `Your stipend is *${formatINR(intern.stipendPaise)}/month*.`;
}

export function statusResponse(intern: InternProfile): string {
  const endDate = new Date(intern.startDate);
  endDate.setDate(endDate.getDate() + intern.durationWeeks * 7);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    `*Your Internship Details:*\n\n` +
    `Name: ${intern.name}\n` +
    `Role: ${intern.role}\n` +
    `Status: ${intern.status}\n` +
    `College: ${intern.college}\n` +
    `Start: ${formatDateIST(intern.startDate)}\n` +
    `Duration: ${intern.durationWeeks} weeks\n` +
    `Days remaining: ${daysLeft}\n` +
    `Stipend: ${formatINR(intern.stipendPaise)}/month`
  );
}

export function notActiveResponse(): string {
  return `This feature is available only for active interns. Your current status doesn't allow this action.`;
}

export function unknownResponse(): string {
  return `I didn't understand that. Type "help" to see what I can do.`;
}
