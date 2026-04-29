import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "admin" && !session.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return NextResponse.json({ error: "internId is required" }, { status: 400 });
    }

    if (session.role === "intern" && session.sub !== internId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.role === "admin") {
      const intern = await prisma.intern.findUnique({
        where: { id: internId },
        select: { orgId: true },
      });
      if (!intern || intern.orgId !== session.orgId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const scores = await prisma.performanceScore.findMany({
      where: { internId },
      orderBy: { weekLabel: "asc" },
    });

    return NextResponse.json({ scores });
  } catch (err) {
    return serverError(err, "Analytics scores GET error");
  }
}
