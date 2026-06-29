import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import {
  createEvent,
  isGoogleCalendarConfigured,
  DEFAULT_CALENDAR_TIMEZONE,
} from "@/lib/google-calendar";
import { buildIcsContent } from "@/lib/ics";

const createSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
  attendeeEmails: z.array(z.string().email()).optional(),
});

function shapeEvent<T extends Record<string, unknown>>(event: T) {
  return {
    ...event,
    startAt:
      event.startAt instanceof Date
        ? event.startAt.toISOString()
        : event.startAt,
    endAt:
      event.endAt instanceof Date ? event.endAt.toISOString() : event.endAt,
    createdAt:
      event.createdAt instanceof Date
        ? event.createdAt.toISOString()
        : event.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidateId = req.nextUrl.searchParams.get("candidateId") ?? undefined;

    const events = await prisma.scheduledEvent.findMany({
      where: {
        orgId: session.orgId,
        ...(candidateId ? { candidateId } : {}),
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({
      events: events.map(shapeEvent),
      googleConfigured: isGoogleCalendarConfigured(),
    });
  } catch (err) {
    return serverError(err, "Scheduling events GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const {
      candidateId,
      title,
      description,
      startAt,
      endAt,
      timezone,
      attendeeEmails,
    } = parsed.data;

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (end <= start) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
      include: { jobPosting: { select: { orgId: true, title: true } } },
    });

    if (!candidate || candidate.jobPosting.orgId !== session.orgId) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const eventTitle =
      title ?? `Interview: ${candidate.name} — ${candidate.jobPosting.title}`;
    const eventTimezone = timezone ?? DEFAULT_CALENDAR_TIMEZONE;
    const attendees = [
      candidate.email,
      ...(attendeeEmails ?? []).filter((e) => e !== candidate.email),
    ];

    let googleEventId: string | null = null;
    let meetLink: string | null = null;
    let icsContent: string | undefined;

    if (isGoogleCalendarConfigured()) {
      const google = await createEvent({
        title: eventTitle,
        description,
        start,
        end,
        timezone: eventTimezone,
        attendees,
      });
      googleEventId = google.eventId;
      meetLink = google.meetLink;
    } else {
      icsContent = buildIcsContent({
        uid: `hrms-${candidateId}-${Date.now()}@intelliforge.tech`,
        title: eventTitle,
        description,
        start,
        end,
        attendeeEmails: attendees,
        timezone: eventTimezone,
      });
    }

    const event = await prisma.scheduledEvent.create({
      data: {
        orgId: session.orgId,
        candidateId,
        title: eventTitle,
        description,
        startAt: start,
        endAt: end,
        timezone: eventTimezone,
        googleEventId,
        meetLink,
        createdById: session.sub,
      },
    });

    return NextResponse.json(
      {
        event: shapeEvent(event),
        googleConfigured: isGoogleCalendarConfigured(),
        icsContent,
      },
      { status: 201 }
    );
  } catch (err) {
    return serverError(err, "Scheduling events POST error");
  }
}
