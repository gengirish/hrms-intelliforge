import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthIntern } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { scheduleLearningProvision } from "@/lib/learning-provision";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(getClientIp(req), 20)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const intern = await getAuthIntern();
    if (!intern) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (intern.status !== "OFFERED") {
      return NextResponse.json(
        { error: `Cannot accept offer in ${intern.status} status` },
        { status: 400 }
      );
    }

    await prisma.intern.update({
      where: { id: intern.id },
      data: { status: "ACTIVE", acceptedAt: new Date() },
    });

    scheduleLearningProvision(intern.id);

    return NextResponse.json({ ok: true, status: "ACTIVE" });
  } catch (err) {
    console.error("Accept error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
