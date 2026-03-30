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

    const interns = await prisma.intern.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ interns });
  } catch (err: unknown) {
    return serverError(err, "Dashboard API error");
  }
}
