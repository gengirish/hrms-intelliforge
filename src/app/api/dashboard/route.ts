import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";

export async function GET() {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }

    const where = admin.orgId ? { orgId: admin.orgId } : {};

    const interns = await prisma.intern.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ interns });
  } catch (err: unknown) {
    return serverError(err, "Dashboard API error");
  }
}
