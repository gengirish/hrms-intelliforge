import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const job = await prisma.jobPosting.findUnique({
      where: { id },
      select: { orgId: true },
    });

    if (!job || job.orgId !== session.orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const candidates = await prisma.candidate.findMany({
      where: { jobPostingId: id },
      orderBy: [
        { interviewScore: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ candidates });
  } catch (err) {
    return serverError(err, "Candidates GET error");
  }
}
