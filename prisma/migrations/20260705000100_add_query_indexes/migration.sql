-- Составные индексы под частые запросы ленты, cleanup и списка диалогов.
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");

CREATE INDEX "Listing_status_soldAt_idx" ON "Listing"("status", "soldAt");

CREATE INDEX "Listing_status_expiresAt_idx" ON "Listing"("status", "expiresAt");

CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");
