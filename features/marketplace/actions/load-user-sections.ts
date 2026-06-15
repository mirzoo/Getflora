"use server";

import { getConversationPreviews } from "@/features/chat/services/conversations-repository";
import { getMyListings } from "@/features/listings/services/listings-repository";
import { getOrCreateSupportConversationForCurrentUser } from "@/features/support/services/support-repository";

export async function loadConversationPreviewsAction() {
  return getConversationPreviews();
}

export async function loadSupportConversationAction() {
  return getOrCreateSupportConversationForCurrentUser();
}

export async function loadMyListingsAction() {
  return getMyListings();
}
