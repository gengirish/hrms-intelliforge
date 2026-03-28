import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInternMessages } from "@/lib/agentmail";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Intern id required" }, { status: 400 });
  }

  const intern = await prisma.intern.findUnique({
    where: { id },
    include: {
      attendance: { orderBy: { date: "desc" }, take: 30 },
      tasks: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!intern) {
    return NextResponse.json({ error: "Intern not found" }, { status: 404 });
  }

  let messages: unknown[] = [];
  if (intern.agentmailInboxId) {
    try {
      messages = await getInternMessages(intern.agentmailInboxId);
    } catch (err) {
      console.error("Failed to fetch agentmail messages:", err);
    }
  }

  return NextResponse.json({
    ...intern,
    messages,
  });
}
