import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isFullOrgAdminRole } from "@/lib/org-admin-roles";
import { errorResponse, serverError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"]);

/** Org-admin list of mentor applications, optionally filtered by ?status=. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.sub || session.role !== "admin" || !session.orgId) {
      return errorResponse("Unauthorized", 401);
    }
    if (!isFullOrgAdminRole(session.adminOrgRole)) {
      return errorResponse("Forbidden", 403);
    }

    const statusParam = new URL(req.url).searchParams.get("status");
    const status = statusParam && STATUSES.has(statusParam) ? statusParam : undefined;

    const applications = await prisma.mentorApplication.findMany({
      where: { orgId: session.orgId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        headline: true,
        bio: true,
        expertise: true,
        yearsExperience: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        status: true,
        reviewNote: true,
        reviewedAt: true,
        resultingAdminId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ applications });
  } catch (err) {
    return serverError(err, "Mentor applications GET error");
  }
}
