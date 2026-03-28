import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    return NextResponse.json({ error: "Not authorized. Admin access required." }, { status: 403 });
  }

  const interns = await prisma.intern.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interns });
}
