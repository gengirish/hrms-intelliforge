-- D11: old slugs of a posting, so links keep working after a slug is
-- regenerated from a new title. /internships/<old> permanently redirects.
ALTER TABLE "job_postings" ADD COLUMN "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "job_postings_previousSlugs_idx" ON "job_postings" USING GIN ("previousSlugs");
