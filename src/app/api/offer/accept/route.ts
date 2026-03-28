import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { internId } = await req.json();
    if (!internId) {
      return NextResponse.json({ error: "internId required" }, { status: 400 });
    }

    const intern = await prisma.intern.findUnique({ where: { id: internId } });
    if (!intern) {
      return NextResponse.json({ error: "Intern not found" }, { status: 404 });
    }

    if (intern.status !== "OFFERED") {
      return NextResponse.json(
        { error: `Cannot accept offer in ${intern.status} status` },
        { status: 400 }
      );
    }

    await prisma.intern.update({
      where: { id: internId },
      data: { status: "ACTIVE", acceptedAt: new Date() },
    });

    return NextResponse.json({ ok: true, status: "ACTIVE" });
  } catch (err) {
    console.error("Accept error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
