"use server";

import { getConversationPreviews } from "@/features/chat/services/conversations-repository";
import { getMyListings } from "@/features/listings/services/listings-repository";

export async function loadConversationPreviewsAction() {
  return getConversationPreviews();
}

export async function loadMyListingsAction() {
  return getMyListings();
}
