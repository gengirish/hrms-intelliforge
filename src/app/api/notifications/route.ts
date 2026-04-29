import { NextRequest, NextResponse } from "next/server";
import { NotificationChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { errorResponse, serverError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!admin.orgId) {
      return NextResponse.json(
        { error: "Your admin account isn't attached to an organization. Contact support." },
        { status: 403 }
      );
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return errorResponse("internId is required", 400);
    }

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      select: { orgId: true },
    });
    if (!intern || intern.orgId !== admin.orgId) {
      return errorResponse("Intern not found", 404);
    }

    const channelParam = req.nextUrl.searchParams.get("channel");
    if (
      channelParam &&
      channelParam !== "EMAIL" &&
      channelParam !== "WHATSAPP"
    ) {
      return errorResponse("channel must be EMAIL or WHATSAPP", 400);
    }

    const pageRaw = req.nextUrl.searchParams.get("page");
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const page = Math.max(
      1,
      Number.parseInt(pageRaw ?? "1", 10) || 1
    );
    const limitUncapped = Number.parseInt(limitRaw ?? "20", 10);
    const limit = Math.min(
      100,
      Math.max(1, Number.isNaN(limitUncapped) ? 20 : limitUncapped)
    );

    const channel =
      channelParam === "EMAIL"
        ? NotificationChannel.EMAIL
        : channelParam === "WHATSAPP"
          ? NotificationChannel.WHATSAPP
          : undefined;

    const where = {
      internId,
      ...(channel ? { channel } : {}),
    };

    const [notifications, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return NextResponse.json({
      notifications,
      total,
      page,
      limit,
    });
  } catch (err: unknown) {
    return serverError(err, "Notifications list error");
  }
}
