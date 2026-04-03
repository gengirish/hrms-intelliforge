import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIntern, getAuthAdmin, getSession } from "@/lib/auth";
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

    const session = await getSession();
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.role === "admin") {
      const admin = await getAuthAdmin();
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const todayStart = getISTStartOfDay();
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      const weekStart = getISTStartOfWeek();

      const activeInterns = await prisma.intern.findMany({
        where: {
          orgId: admin.orgId,
          status: { in: ["ACTIVE", "OFFERED"] },
          deactivated: { not: true },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
        },
        orderBy: { name: "asc" },
      });

      const internIds = activeInterns.map((i) => i.id);

      const todayRecords = await prisma.attendance.findMany({
        where: {
          internId: { in: internIds },
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      const weekRecords = await prisma.attendance.findMany({
        where: {
          internId: { in: internIds },
          date: { gte: weekStart },
        },
        include: { intern: { select: { name: true } } },
        orderBy: { date: "desc" },
      });

      const todayMap = new Map(todayRecords.map((r) => [r.internId, r]));

      const overview = activeInterns.map((intern) => {
        const record = todayMap.get(intern.id);
        return {
          ...intern,
          today: record
            ? {
                id: record.id,
                punchIn: record.punchIn,
                punchOut: record.punchOut,
                mode: record.mode,
                dailyStatus: record.dailyStatus,
              }
            : null,
        };
      });

      const summary = {
        total: activeInterns.length,
        present: todayRecords.length,
        absent: activeInterns.length - todayRecords.length,
        punchedOut: todayRecords.filter((r) => r.punchOut).length,
        withStatus: todayRecords.filter((r) => r.dailyStatus).length,
      };

      return NextResponse.json({
        role: "admin",
        adminName: admin.name,
        overview,
        summary,
        weekRecords: weekRecords.map((r) => ({
          id: r.id,
          internId: r.internId,
          internName: r.intern.name,
          date: r.date,
          punchIn: r.punchIn,
          punchOut: r.punchOut,
          mode: r.mode,
          dailyStatus: r.dailyStatus,
        })),
      });
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
      role: "intern",
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

    const { type, mode, dailyStatus } = parsed.data;
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
          dailyStatus: dailyStatus || null,
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

    if (type === "status") {
      const existing = await prisma.attendance.findFirst({
        where: {
          internId,
          date: { gte: todayStart, lt: todayEnd },
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Punch in first before adding a status update" }, { status: 400 });
      }

      const record = await prisma.attendance.update({
        where: { id: existing.id },
        data: { dailyStatus: dailyStatus || null },
      });

      return NextResponse.json({ record });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err: unknown) {
    return serverError(err, "Attendance POST error");
  }
}
