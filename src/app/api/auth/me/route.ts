import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return errorResponse("Not authenticated", 401);
  }

  if (session.role === "admin") {
    const admin = await prisma.admin.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, role: true },
    });
    if (!admin) return errorResponse("Account not found", 404);
    return NextResponse.json({ user: { ...admin, accountType: "admin" } });
  }

  const intern = await prisma.intern.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, role: true, photoUrl: true },
  });
  if (!intern) return errorResponse("Account not found", 404);
  return NextResponse.json({ user: { ...intern, accountType: "intern" } });
}
