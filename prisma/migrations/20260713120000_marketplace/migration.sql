-- Marketplace: mentor profiles, bookings, ratings, platform fees

-- AlterTable organizations
ALTER TABLE "organizations" ADD COLUMN "max_mentors" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "organizations" ADD COLUMN "platform_fee_bps" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "organizations" ADD COLUMN "marketplace_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable stipend_payouts
ALTER TABLE "stipend_payouts" ADD COLUMN "platform_fee_paise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "stipend_payouts" ADD COLUMN "net_amount_paise" INTEGER;

-- CreateEnum
CREATE TYPE "MentorBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "MarketplaceTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable mentor_profiles
CREATE TABLE "mentor_profiles" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "expertise" TEXT[],
    "years_experience" INTEGER,
    "linkedin_url" TEXT,
    "github_url" TEXT,
    "avatar_url" TEXT,
    "hourly_rate_paise" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "avg_rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentor_availability
CREATE TABLE "mentor_availability" (
    "id" TEXT NOT NULL,
    "mentor_profile_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',

    CONSTRAINT "mentor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentor_ratings
CREATE TABLE "mentor_ratings" (
    "id" TEXT NOT NULL,
    "mentor_profile_id" TEXT NOT NULL,
    "intern_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentor_bookings
CREATE TABLE "mentor_bookings" (
    "id" TEXT NOT NULL,
    "mentor_profile_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "intern_id" TEXT,
    "requester_name" TEXT NOT NULL,
    "requester_email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" "MentorBookingStatus" NOT NULL DEFAULT 'PENDING',
    "google_event_id" TEXT,
    "meet_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable mentor_payout_profiles
CREATE TABLE "mentor_payout_profiles" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "razorpay_contact_id" TEXT,
    "razorpay_fund_account_id" TEXT,
    "recipient_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentor_payout_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable marketplace_transactions
CREATE TABLE "marketplace_transactions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "payout_id" TEXT,
    "recipient_type" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "gross_amount_paise" INTEGER NOT NULL,
    "platform_fee_paise" INTEGER NOT NULL,
    "net_amount_paise" INTEGER NOT NULL,
    "fee_bps" INTEGER NOT NULL,
    "status" "MarketplaceTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "razorpay_payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_admin_id_key" ON "mentor_profiles"("admin_id");
CREATE UNIQUE INDEX "mentor_profiles_slug_key" ON "mentor_profiles"("slug");
CREATE INDEX "mentor_profiles_org_id_idx" ON "mentor_profiles"("org_id");
CREATE INDEX "mentor_profiles_is_public_is_premium_idx" ON "mentor_profiles"("is_public", "is_premium");

CREATE INDEX "mentor_availability_mentor_profile_id_idx" ON "mentor_availability"("mentor_profile_id");

CREATE UNIQUE INDEX "mentor_ratings_mentor_profile_id_intern_id_key" ON "mentor_ratings"("mentor_profile_id", "intern_id");
CREATE INDEX "mentor_ratings_mentor_profile_id_idx" ON "mentor_ratings"("mentor_profile_id");

CREATE INDEX "mentor_bookings_mentor_profile_id_idx" ON "mentor_bookings"("mentor_profile_id");
CREATE INDEX "mentor_bookings_org_id_idx" ON "mentor_bookings"("org_id");
CREATE INDEX "mentor_bookings_intern_id_idx" ON "mentor_bookings"("intern_id");

CREATE UNIQUE INDEX "mentor_payout_profiles_admin_id_key" ON "mentor_payout_profiles"("admin_id");
CREATE INDEX "mentor_payout_profiles_admin_id_idx" ON "mentor_payout_profiles"("admin_id");

CREATE UNIQUE INDEX "marketplace_transactions_payout_id_key" ON "marketplace_transactions"("payout_id");
CREATE INDEX "marketplace_transactions_org_id_idx" ON "marketplace_transactions"("org_id");
CREATE INDEX "marketplace_transactions_recipient_type_recipient_id_idx" ON "marketplace_transactions"("recipient_type", "recipient_id");

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_ratings" ADD CONSTRAINT "mentor_ratings_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_bookings" ADD CONSTRAINT "mentor_bookings_mentor_profile_id_fkey" FOREIGN KEY ("mentor_profile_id") REFERENCES "mentor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "stipend_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
