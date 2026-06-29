-- CreateEnum
CREATE TYPE "EsignStatus" AS ENUM ('PENDING', 'SENT', 'SIGNED', 'DECLINED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "offer_esign_requests" (
    "id" TEXT NOT NULL,
    "internId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "EsignStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'digio',
    "providerDocId" TEXT,
    "signingUrl" TEXT,
    "signedPdfUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_esign_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offer_esign_requests_internId_idx" ON "offer_esign_requests"("internId");

-- CreateIndex
CREATE INDEX "offer_esign_requests_orgId_idx" ON "offer_esign_requests"("orgId");
