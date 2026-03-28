import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const intern = await prisma.intern.findUnique({ where: { email } });
  if (!intern) {
    return NextResponse.json({ error: "No offer found for this email" }, { status: 404 });
  }

  return NextResponse.json({
    id: intern.id,
    name: intern.name,
    role: intern.role,
    stipendPaise: intern.stipendPaise,
    startDate: intern.startDate,
    durationWeeks: intern.durationWeeks,
    mentorId: intern.mentorId,
    status: intern.status,
    college: intern.college,
  });
}
