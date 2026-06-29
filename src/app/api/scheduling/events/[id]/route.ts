import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serverError } from "@/lib/api-utils";
import { cancelEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.scheduledEvent.findUnique({ where: { id } });

    if (!event || event.orgId !== session.orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (event.status === "CANCELLED") {
      return NextResponse.json({ ok: true, alreadyCancelled: true });
    }

    if (event.googleEventId && isGoogleCalendarConfigured()) {
      await cancelEvent(event.googleEventId);
    }

    await prisma.scheduledEvent.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, "Scheduling event DELETE error");
  }
}
