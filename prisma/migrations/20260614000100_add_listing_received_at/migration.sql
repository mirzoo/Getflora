ALTER TABLE "Listing" ADD COLUMN "receivedAt" TIMESTAMP(3);

UPDATE "Listing"
SET "receivedAt" = "createdAt"
WHERE "receivedAt" IS NULL;

ALTER TABLE "Listing" ALTER COLUMN "receivedAt" SET NOT NULL;
