import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { getInternForAdmin } from "@/lib/admin-intern-access";
import { adminWeekTasksSchema } from "@/lib/validations";
import { getCurrentISOWeek } from "@/lib/utils";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 40)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const internId = req.nextUrl.searchParams.get("internId")?.trim();
    if (!internId) {
      return NextResponse.json({ error: "internId required" }, { status: 400 });
    }

    const intern = await getInternForAdmin(admin, internId);
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    const weekKey =
      req.nextUrl.searchParams.get("week")?.trim() || getCurrentISOWeek();
    if (!WEEK_KEY_RE.test(weekKey)) {
      return NextResponse.json(
        { error: "Invalid week (use YYYY-Www)" },
        { status: 400 }
      );
    }

    const tasks = await prisma.task.findMany({
      where: { internId: intern.id, week: weekKey },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      internId: intern.id,
      internName: intern.name,
      weekKey,
      tasks,
    });
  } catch (err: unknown) {
    return serverError(err, "Dashboard tasks GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = adminWeekTasksSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { internId, weekKey, tasks } = parsed.data;
    const intern = await getInternForAdmin(admin, internId);
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (intern.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Tasks can only be assigned to active interns" },
        { status: 400 }
      );
    }

    const created = await prisma.$transaction(
      tasks.map((task) =>
        prisma.task.create({
          data: {
            internId: intern.id,
            title: task.title,
            description: task.description?.trim() || "Assigned by admin",
            status: task.status,
            hours: task.hours,
            week: weekKey,
          },
        })
      )
    );

    return NextResponse.json({
      weekKey,
      internId: intern.id,
      tasks: created,
      count: created.length,
    });
  } catch (err: unknown) {
    return serverError(err, "Dashboard tasks POST");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 403 }
      );
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization." },
        { status: 403 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Task id required" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { intern: { select: { orgId: true, mentorId: true } } },
    });
    if (!task || task.intern.orgId !== admin.orgId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const intern = await getInternForAdmin(admin, task.internId);
    if (!intern) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err, "Dashboard tasks DELETE");
  }
}
