-- STIPEND (existing interns) or COMMISSION (sales interns, no fixed pay).
ALTER TABLE "interns" ADD COLUMN "compensationType" TEXT NOT NULL DEFAULT 'STIPEND';
