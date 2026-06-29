/**
 * Minimal ICS (iCalendar) generator for interview invites when Google
 * Calendar credentials are not configured.
 */

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  organizerEmail?: string;
  attendeeEmails?: string[];
  timezone?: string;
}

function formatIcsUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const max = 75;
  if (line.length <= max) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, max));
  rest = rest.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

export function buildIcsContent(input: IcsEventInput): string {
  const now = formatIcsUtc(new Date());
  const dtStart = formatIcsUtc(input.start);
  const dtEnd = formatIcsUtc(input.end);
  const tz = input.timezone ?? "Asia/Kolkata";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IntelliForge HRMS//Interview Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    `X-WR-TIMEZONE:${tz}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeIcsText(input.title)}`),
  ];

  if (input.description) {
    lines.push(foldLine(`DESCRIPTION:${escapeIcsText(input.description)}`));
  }
  if (input.location) {
    lines.push(foldLine(`LOCATION:${escapeIcsText(input.location)}`));
  }
  if (input.organizerEmail) {
    lines.push(`ORGANIZER;CN=IntelliForge HRMS:mailto:${input.organizerEmail}`);
  }
  for (const email of input.attendeeEmails ?? []) {
    lines.push(`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`);
  }

  lines.push("STATUS:CONFIRMED", "SEQUENCE:0", "END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}

export function downloadIcsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
