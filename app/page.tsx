import type { Metadata } from "next";

import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";
import { getSessionUser } from "@/features/auth/services/current-user";
import { getConversationPreviews } from "@/features/chat/services/conversations-repository";

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
    sell?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const [listings, sessionUser] = await Promise.all([
    getMarketplaceListings(),
    getSessionUser(),
  ]);
  const initialView = params.account === "1" && sessionUser
    ? "account"
    : params.sell === "1" && sessionUser
    ? "sell"
    : params.view === "messages" && sessionUser
      ? "messages"
      : params.view === "my-listings"
      ? params.view
      : "marketplace";
  const initialConversations = initialView === "messages"
    ? await getConversationPreviews()
    : undefined;

  return (
    <MarketplaceShell
      initialView={initialView}
      initialListings={listings}
      initialConversations={initialConversations}
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
