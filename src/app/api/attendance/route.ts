import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getISTStartOfDay() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

function getISTStartOfWeek() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const day = istNow.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  istNow.setUTCDate(istNow.getUTCDate() - diff);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffset);
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const intern = await prisma.intern.findUnique({ where: { email } });
  if (!intern) {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 });
  }

  if (intern.status !== "ACTIVE" && intern.status !== "OFFERED") {
    return NextResponse.json(
      { error: "Attendance is available for active interns only" },
      { status: 403 }
    );
  }

  const todayStart = getISTStartOfDay();
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = getISTStartOfWeek();

  const today = await prisma.attendance.findFirst({
    where: {
      internId: intern.id,
      date: { gte: todayStart, lt: todayEnd },
    },
  });

  const week = await prisma.attendance.findMany({
    where: {
      internId: intern.id,
      date: { gte: weekStart },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    internId: intern.id,
    internName: intern.name,
    today,
    week,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { internId, type, mode } = await req.json();

    if (!internId || !type) {
      return NextResponse.json({ error: "internId and type required" }, { status: 400 });
    }

    const todayStart = getISTStartOfDay();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();

    if (type === "in") {
      const existing = await prisma.attendance.findFirst({
        where: {
          internId,
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      if (existing) {
        return NextResponse.json({ error: "Already punched in today" }, { status: 400 });
      }

      const record = await prisma.attendance.create({
        data: {
          internId,
          date: todayStart,
          punchIn: now,
          mode: mode || "WFH",
        },
      });

      return NextResponse.json({ record });
    }

    if (type === "out") {
      const existing = await prisma.attendance.findFirst({
        where: {
          internId,
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "No punch-in record found" }, { status: 400 });
      }

      if (existing.punchOut) {
        return NextResponse.json({ error: "Already punched out today" }, { status: 400 });
      }

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: { punchOut: now },
      });

      return NextResponse.json({ record });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Attendance error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
