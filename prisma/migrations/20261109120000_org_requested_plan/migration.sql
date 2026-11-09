-- D2: the paid plan a workspace picked on /create-org but has not paid for yet.
-- Nullable, no backfill: existing orgs have no pending request.
ALTER TABLE "organizations" ADD COLUMN "requestedPlan" TEXT;
