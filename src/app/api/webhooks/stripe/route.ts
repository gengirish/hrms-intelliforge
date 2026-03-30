import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getPlanLimits } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan;
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.toString() ?? null;

        if (orgId && plan) {
          const limits = getPlanLimits(plan);
          await prisma.organization.update({
            where: { id: orgId },
            data: {
              plan,
              stripeSubId: subId,
              maxInterns: limits.maxInterns,
            },
          });
          console.info(`[stripe] Org ${orgId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const org = await prisma.organization.findFirst({
          where: { stripeSubId: sub.id },
        });
        if (org && sub.status === "active") {
          console.info(`[stripe] Subscription ${sub.id} updated for org ${org.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const org = await prisma.organization.findFirst({
          where: { stripeSubId: sub.id },
        });
        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              plan: "free",
              stripeSubId: null,
              maxInterns: 5,
            },
          });
          console.info(`[stripe] Org ${org.id} downgraded to free (subscription cancelled)`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
  }

  return NextResponse.json({ received: true });
}
