import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { attendanceSchema } from "@/lib/validations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

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
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  } catch (err: unknown) {
    return serverError(err, "Attendance GET error");
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = attendanceSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { type, mode } = parsed.data;
    const internId = intern.id;

    const todayStart = getISTStartOfDay();
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();

    if (intern.status !== "ACTIVE" && intern.status !== "OFFERED") {
      return NextResponse.json(
        { error: "Attendance is available for active interns only" },
        { status: 403 }
      );
    }

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
          mode,
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
  } catch (err: unknown) {
    return serverError(err, "Attendance POST error");
  }
}
