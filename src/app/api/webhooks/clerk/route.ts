import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { syncClerkUserToHrms } from "@/lib/clerk-hrms-metadata";

type ClerkWebhookEvent = {
  type: string;
  data: { id?: string };
};

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const rawBody = await req.text();
  let evt: ClerkWebhookEvent;
  try {
    evt = new Webhook(secret).verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch (err) {
    console.error("Clerk webhook verify failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const clerkUserId = evt.data?.id;
  if (!clerkUserId) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      await syncClerkUserToHrms(clerkUserId);
    }
    if (evt.type === "user.deleted") {
      await prisma.admin.updateMany({
        where: { clerkUserId },
        data: { clerkUserId: null },
      });
      await prisma.intern.updateMany({
        where: { clerkUserId },
        data: { clerkUserId: null },
      });
    }
  } catch (e) {
    console.error("Clerk webhook handler error:", e);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
