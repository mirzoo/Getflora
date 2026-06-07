-- Dedupe buyer conversations before adding unique constraint.
DELETE FROM "Conversation" AS duplicate
USING "Conversation" AS keeper
WHERE duplicate."listingId" = keeper."listingId"
  AND duplicate."buyerId" = keeper."buyerId"
  AND duplicate."buyerId" IS NOT NULL
  AND duplicate."createdAt" > keeper."createdAt";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "soldToBuyerId" TEXT;

-- CreateIndex
CREATE INDEX "Listing_soldToBuyerId_idx" ON "Listing"("soldToBuyerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_listingId_buyerId_key" ON "Conversation"("listingId", "buyerId");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_soldToBuyerId_fkey" FOREIGN KEY ("soldToBuyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
