-- Idempotency ledger for inbound provider webhooks (Stripe, RazorpayX, Digio,
-- WhatsApp, AgentMail). Deliberately no FK to organizations: orgId is optional.

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orgId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_eventId_key" ON "webhook_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "webhook_events_receivedAt_idx" ON "webhook_events"("receivedAt");
