import { NextRequest, NextResponse } from "next/server";
import { DailyPlanStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { dailyPlanActionSchema } from "@/lib/validations";
import { getISTStartOfDay } from "@/lib/utils";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { serverError } from "@/lib/api-utils";

function internPlanAllowed(intern: { status: string }) {
  return intern.status === "ACTIVE";
}

async function getOrCreateTodayPlan(internId: string) {
  const todayStart = getISTStartOfDay();
  return prisma.dailyTaskPlan.upsert({
    where: {
      internId_date: { internId, date: todayStart },
    },
    create: {
      internId,
      date: todayStart,
      status: DailyPlanStatus.DRAFT,
    },
    update: {},
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
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

    if (!internPlanAllowed(intern)) {
      return NextResponse.json(
        { error: "Daily task plan is available for active interns only" },
        { status: 403 }
      );
    }

    const plan = await getOrCreateTodayPlan(intern.id);

    return NextResponse.json({
      internName: intern.name,
      plan,
    });
  } catch (err: unknown) {
    return serverError(err, "Daily plan GET error");
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

    if (!internPlanAllowed(intern)) {
      return NextResponse.json(
        { error: "Daily task plan is available for active interns only" },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = dailyPlanActionSchema.safeParse(json);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Invalid input";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const plan = await getOrCreateTodayPlan(intern.id);
    const data = parsed.data;

    if (data.action === "update") {
      const existing = plan.items.find((i) => i.id === data.itemId);
      if (!existing) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      const onlyStatus =
        data.status !== undefined &&
        data.title === undefined &&
        data.description === undefined;

      if (plan.status === DailyPlanStatus.SUBMITTED && !onlyStatus) {
        return NextResponse.json(
          { error: "Submitted plans can only update task status" },
          { status: 409 }
        );
      }

      const item = await prisma.dailyTaskItem.update({
        where: { id: data.itemId },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
      });

      const updated = await prisma.dailyTaskPlan.findUnique({
        where: { id: plan.id },
        include: {
          items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      });
      return NextResponse.json({ item, plan: updated });
    }

    if (plan.status === DailyPlanStatus.SUBMITTED) {
      return NextResponse.json(
        { error: "Today's plan is already submitted" },
        { status: 409 }
      );
    }

    if (data.action === "add") {
      const itemCount = plan.items.length;
      const item = await prisma.dailyTaskItem.create({
        data: {
          planId: plan.id,
          title: data.title,
          description: data.description ?? "",
          sortOrder: itemCount,
        },
      });
      const updated = await prisma.dailyTaskPlan.findUnique({
        where: { id: plan.id },
        include: {
          items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      });
      return NextResponse.json({ item, plan: updated });
    }

    if (data.action === "delete") {
      const existing = plan.items.find((i) => i.id === data.itemId);
      if (!existing) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      await prisma.dailyTaskItem.delete({ where: { id: data.itemId } });

      const updated = await prisma.dailyTaskPlan.findUnique({
        where: { id: plan.id },
        include: {
          items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      });
      return NextResponse.json({ ok: true, plan: updated });
    }

    // submit
    if (plan.items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one task before submitting" },
        { status: 400 }
      );
    }

    const updatedPlan = await prisma.dailyTaskPlan.update({
      where: { id: plan.id },
      data: {
        status: DailyPlanStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });

    return NextResponse.json({ plan: updatedPlan });
  } catch (err: unknown) {
    return serverError(err, "Daily plan POST error");
  }
}
