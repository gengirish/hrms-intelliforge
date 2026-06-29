-- CreateEnum
CREATE TYPE "StipendPayoutStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PROCESSED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "stipend_payout_batches" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "StipendPayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "totalPaise" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stipend_payout_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stipend_payouts" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" "StipendPayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "razorpayPayoutId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stipend_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intern_payout_profiles" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "razorpayContactId" TEXT,
    "razorpayFundAccountId" TEXT,
    "recipientJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intern_payout_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stipend_payout_batches_orgId_month_idx" ON "stipend_payout_batches"("orgId", "month");

-- CreateIndex
CREATE INDEX "stipend_payouts_batchId_idx" ON "stipend_payouts"("batchId");

-- CreateIndex
CREATE INDEX "stipend_payouts_internId_idx" ON "stipend_payouts"("internId");

-- CreateIndex
CREATE UNIQUE INDEX "intern_payout_profiles_internId_key" ON "intern_payout_profiles"("internId");

-- CreateIndex
CREATE INDEX "intern_payout_profiles_internId_idx" ON "intern_payout_profiles"("internId");

-- AddForeignKey
ALTER TABLE "stipend_payouts" ADD CONSTRAINT "stipend_payouts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "stipend_payout_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (intern payout profile → intern, appended without Prisma relation on Intern)
ALTER TABLE "intern_payout_profiles" ADD CONSTRAINT "intern_payout_profiles_internId_fkey" FOREIGN KEY ("internId") REFERENCES "interns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
