import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const statusParam = req.nextUrl.searchParams.get("status");
    const pageRaw = req.nextUrl.searchParams.get("page");
    const limitRaw = req.nextUrl.searchParams.get("limit");

    const page = Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1);
    const limitUncapped = Number.parseInt(limitRaw ?? "20", 10);
    const limit = Math.min(
      100,
      Math.max(1, Number.isNaN(limitUncapped) ? 20 : limitUncapped)
    );

    const validStatuses = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];
    const status =
      statusParam && validStatuses.includes(statusParam)
        ? statusParam
        : undefined;

    const where = {
      orgId: admin.orgId,
      ...(status ? { status: status as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.mentorBooking.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          requesterName: true,
          requesterEmail: true,
          title: true,
          notes: true,
          startAt: true,
          endAt: true,
          timezone: true,
          status: true,
          meetLink: true,
          createdAt: true,
          internId: true,
          mentorProfile: {
            select: {
              slug: true,
              admin: { select: { name: true, email: true } },
            },
          },
        },
      }),
      prisma.mentorBooking.count({ where }),
    ]);

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        requesterName: b.requesterName,
        requesterEmail: b.requesterEmail,
        title: b.title,
        notes: b.notes,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        timezone: b.timezone,
        status: b.status,
        meetLink: b.meetLink,
        createdAt: b.createdAt.toISOString(),
        internId: b.internId,
        mentorName: b.mentorProfile.admin.name ?? b.mentorProfile.admin.email,
        mentorSlug: b.mentorProfile.slug,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    return serverError(err, "Mentor bookings GET error");
  }
}
