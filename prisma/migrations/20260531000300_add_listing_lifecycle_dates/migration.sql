-- Add lifecycle timestamps for seller workflow.
ALTER TABLE "Listing" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "archivedAt" TIMESTAMP(3);
