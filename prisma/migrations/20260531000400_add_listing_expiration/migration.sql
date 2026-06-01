ALTER TABLE "Listing" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "Listing"
SET "expiresAt" = "createdAt" + INTERVAL '48 hours'
WHERE "status" = 'ACTIVE' AND "expiresAt" IS NULL;

CREATE INDEX "Listing_expiresAt_idx" ON "Listing"("expiresAt");
