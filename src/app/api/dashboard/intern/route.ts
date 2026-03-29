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

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Intern id required" }, { status: 400 });
    }

    const intern = await prisma.intern.findUnique({
      where: { id },
      include: {
        attendance: { orderBy: { date: "desc" }, take: 30 },
        tasks: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...intern,
      messages: [],
    });
  } catch (err: unknown) {
    return serverError(err, "Dashboard intern API error");
  }
}
