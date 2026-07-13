import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { recalculateMentorRating } from "@/lib/marketplace";

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!intern.mentorId) {
      return NextResponse.json(
        { error: "You do not have an assigned mentor" },
        { status: 403 }
      );
    }

    const { slug } = await params;

    const profile = await prisma.mentorProfile.findUnique({
      where: { slug },
      select: { id: true, adminId: true, orgId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    if (profile.adminId !== intern.mentorId) {
      return NextResponse.json(
        { error: "You can only rate your assigned mentor" },
        { status: 403 }
      );
    }

    if (profile.orgId !== intern.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = rateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const rating = await prisma.mentorRating.upsert({
      where: {
        mentorProfileId_internId: {
          mentorProfileId: profile.id,
          internId: intern.id,
        },
      },
      create: {
        mentorProfileId: profile.id,
        internId: intern.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      update: {
        rating: parsed.data.rating,
        comment: parsed.data.comment ?? null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    await recalculateMentorRating(profile.id);

    return NextResponse.json({ success: true, rating });
  } catch (err) {
    return serverError(err, "Mentor rating POST error");
  }
}
