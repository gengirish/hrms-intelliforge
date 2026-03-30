import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, PLANS, PlanKey } from "@/lib/stripe";
import { serverError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const plan = body.plan as PlanKey;

    if (!plan || !PLANS[plan] || plan === "free") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const priceId = PLANS[plan].priceId;
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({ where: { id: session.orgId } });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: session.email,
        metadata: { orgId: org.id, orgName: org.name },
      });
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?billing=success`,
      cancel_url: `${appUrl}/dashboard/settings?billing=cancelled`,
      metadata: { orgId: org.id, plan },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    return serverError(err, "Billing checkout error");
  }
}
