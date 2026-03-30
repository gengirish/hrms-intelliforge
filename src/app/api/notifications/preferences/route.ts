import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthAdmin } from "@/lib/auth";
import { errorResponse, serverError } from "@/lib/api-utils";

const putSchema = z.object({
  internId: z.string().min(1),
  email: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const internId = req.nextUrl.searchParams.get("internId");
    if (!internId) {
      return errorResponse("internId is required", 400);
    }

    const intern = await prisma.intern.findUnique({
      where: { id: internId },
      include: { notificationPref: true },
    });
    if (!intern) {
      return errorResponse("Intern not found", 404);
    }

    return NextResponse.json({
      email: intern.notificationPref?.email ?? true,
      whatsapp: intern.notificationPref?.whatsapp ?? true,
      whatsappOptIn: intern.whatsappOptIn,
    });
  } catch (err: unknown) {
    return serverError(err, "Notification preferences GET error");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAuthAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => i.message),
        },
        { status: 400 }
      );
    }

    const { internId, email, whatsapp, whatsappOptIn } = parsed.data;

    const intern = await prisma.intern.findUnique({ where: { id: internId } });
    if (!intern) {
      return errorResponse("Intern not found", 404);
    }

    if (email !== undefined || whatsapp !== undefined) {
      await prisma.notificationPreference.upsert({
        where: { internId },
        create: {
          internId,
          email: email ?? true,
          whatsapp: whatsapp ?? true,
        },
        update: {
          ...(email !== undefined ? { email } : {}),
          ...(whatsapp !== undefined ? { whatsapp } : {}),
        },
      });
    }

    if (whatsappOptIn !== undefined) {
      await prisma.intern.update({
        where: { id: internId },
        data: { whatsappOptIn },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return serverError(err, "Notification preferences PUT error");
  }
}
