-- Rename marketplace migration columns from snake_case to camelCase (Prisma default).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'max_mentors'
  ) THEN
    ALTER TABLE "organizations" RENAME COLUMN "max_mentors" TO "maxMentors";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'platform_fee_bps'
  ) THEN
    ALTER TABLE "organizations" RENAME COLUMN "platform_fee_bps" TO "platformFeeBps";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'marketplace_enabled'
  ) THEN
    ALTER TABLE "organizations" RENAME COLUMN "marketplace_enabled" TO "marketplaceEnabled";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stipend_payouts' AND column_name = 'platform_fee_paise'
  ) THEN
    ALTER TABLE "stipend_payouts" RENAME COLUMN "platform_fee_paise" TO "platformFeePaise";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stipend_payouts' AND column_name = 'net_amount_paise'
  ) THEN
    ALTER TABLE "stipend_payouts" RENAME COLUMN "net_amount_paise" TO "netAmountPaise";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "admin_id" TO "adminId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "org_id" TO "orgId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'years_experience'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "years_experience" TO "yearsExperience";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "linkedin_url" TO "linkedinUrl";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'github_url'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "github_url" TO "githubUrl";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "avatar_url" TO "avatarUrl";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'hourly_rate_paise'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "hourly_rate_paise" TO "hourlyRatePaise";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "is_public" TO "isPublic";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "is_premium" TO "isPremium";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'avg_rating'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "avg_rating" TO "avgRating";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "rating_count" TO "ratingCount";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "mentor_profiles" RENAME COLUMN "updated_at" TO "updatedAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_availability' AND column_name = 'mentor_profile_id'
  ) THEN
    ALTER TABLE "mentor_availability" RENAME COLUMN "mentor_profile_id" TO "mentorProfileId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_availability' AND column_name = 'day_of_week'
  ) THEN
    ALTER TABLE "mentor_availability" RENAME COLUMN "day_of_week" TO "dayOfWeek";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_availability' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE "mentor_availability" RENAME COLUMN "start_time" TO "startTime";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_availability' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE "mentor_availability" RENAME COLUMN "end_time" TO "endTime";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_ratings' AND column_name = 'mentor_profile_id'
  ) THEN
    ALTER TABLE "mentor_ratings" RENAME COLUMN "mentor_profile_id" TO "mentorProfileId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_ratings' AND column_name = 'intern_id'
  ) THEN
    ALTER TABLE "mentor_ratings" RENAME COLUMN "intern_id" TO "internId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_ratings' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "mentor_ratings" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'mentor_profile_id'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "mentor_profile_id" TO "mentorProfileId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "org_id" TO "orgId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'intern_id'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "intern_id" TO "internId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'requester_name'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "requester_name" TO "requesterName";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'requester_email'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "requester_email" TO "requesterEmail";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "start_at" TO "startAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'end_at'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "end_at" TO "endAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'google_event_id'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "google_event_id" TO "googleEventId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'meet_link'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "meet_link" TO "meetLink";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_bookings' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "mentor_bookings" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "admin_id" TO "adminId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'razorpay_contact_id'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "razorpay_contact_id" TO "razorpayContactId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'razorpay_fund_account_id'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "razorpay_fund_account_id" TO "razorpayFundAccountId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'recipient_json'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "recipient_json" TO "recipientJson";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'mentor_payout_profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "mentor_payout_profiles" RENAME COLUMN "updated_at" TO "updatedAt";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "org_id" TO "orgId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'payout_id'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "payout_id" TO "payoutId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'recipient_type'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "recipient_type" TO "recipientType";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'recipient_id'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "recipient_id" TO "recipientId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'gross_amount_paise'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "gross_amount_paise" TO "grossAmountPaise";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'platform_fee_paise'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "platform_fee_paise" TO "platformFeePaise";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'net_amount_paise'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "net_amount_paise" TO "netAmountPaise";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'fee_bps'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "fee_bps" TO "feeBps";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'razorpay_payout_id'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "razorpay_payout_id" TO "razorpayPayoutId";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_transactions' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "marketplace_transactions" RENAME COLUMN "created_at" TO "createdAt";
  END IF;
END $$;
