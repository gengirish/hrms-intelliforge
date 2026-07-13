import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { getClientIp, rateLimitAsync } from "@/lib/rate-limit";

const bookSchema = z.object({
  requesterName: z.string().min(2).max(100),
  requesterEmail: z.string().email(),
  title: z.string().min(2).max(200),
  notes: z.string().max(2000).optional(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  timezone: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitAsync(ip, 5, 60_000))) {
      return NextResponse.json(
        { error: "Too many booking requests. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;

    const profile = await prisma.mentorProfile.findUnique({
      where: { slug, isPublic: true },
      select: { id: true, orgId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = bookSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);
    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const intern = await getAuthIntern();
    const internId =
      intern && intern.orgId === profile.orgId ? intern.id : null;

    const booking = await prisma.mentorBooking.create({
      data: {
        mentorProfileId: profile.id,
        orgId: profile.orgId,
        internId,
        requesterName: parsed.data.requesterName,
        requesterEmail: parsed.data.requesterEmail,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        startAt,
        endAt,
        timezone: parsed.data.timezone ?? "Asia/Kolkata",
        status: "PENDING",
      },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("Mentor booking POST error:", err);
    return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
  }
}
