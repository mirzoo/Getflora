import type { Metadata } from "next";

import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";
import { getSessionUser } from "@/features/auth/services/current-user";
import {
  getConversationPreviews,
  getOrCreateConversationForListing,
} from "@/features/chat/services/conversations-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
    account?: string;
    conversation?: string;
    buyer?: string;
    listing?: string;
    sell?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const sessionUser = await getSessionUser();
  const listings = await getMarketplaceListings(sessionUser?.id);
  const initialView = params.account === "1" && sessionUser
    ? "account"
    : params.sell === "1" && sessionUser
    ? "sell"
    : params.view === "messages" && sessionUser
      ? "messages"
      : params.view === "my-listings"
      ? params.view
      : "marketplace";
  let initialConversationId = params.conversation;
  let initialConversations;

  if (initialView === "messages") {
    if (params.listing) {
      const conversation = await getOrCreateConversationForListing(
        params.listing,
        params.conversation,
        params.buyer,
      );
      initialConversationId = conversation?.id ?? initialConversationId;
    }

    initialConversations = await getConversationPreviews();
  }

  return (
    <MarketplaceShell
      initialView={initialView}
      initialListings={listings}
      initialConversations={initialConversations}
      initialConversationId={initialConversationId}
      initialUser={sessionUser}
      shouldOpenAuth={
        params.auth === "1" ||
        (params.account === "1" && !sessionUser) ||
        (params.sell === "1" && !sessionUser) ||
        (params.view === "messages" && !sessionUser)
      }
    />
  );
}
