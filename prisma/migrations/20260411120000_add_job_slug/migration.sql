-- Step 1: Add slug column as nullable
ALTER TABLE "job_postings" ADD COLUMN "slug" TEXT;

-- Step 2: Backfill existing rows with slug derived from title
UPDATE "job_postings"
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(TRIM(title), '[^\w\s-]', '', 'g'),
      '[\s_]+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
) || '-' || SUBSTRING(id FROM 1 FOR 6)
WHERE "slug" IS NULL;

-- Step 3: Make slug NOT NULL
ALTER TABLE "job_postings" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Add unique index
CREATE UNIQUE INDEX "job_postings_slug_key" ON "job_postings"("slug");
