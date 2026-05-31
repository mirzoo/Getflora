import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings, getMyListings } from "@/features/listings/services/listings-repository";
import { getFavoriteListingIds } from "@/features/favorites/services/favorites-repository";
import { getConversationPreviews } from "@/features/chat/services/conversations-repository";
import { getSessionUser } from "@/features/auth/services/current-user";
import { cleanupExpiredSoldListings } from "@/features/listings/services/listings-cleanup";

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
    sell?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  await cleanupExpiredSoldListings();

  const [listings, favoriteListingIds, conversations, myListings, sessionUser] = await Promise.all([
    getMarketplaceListings(),
    getFavoriteListingIds(),
    getConversationPreviews(),
    getMyListings(),
    getSessionUser(),
  ]);
  const initialView = params.sell === "1" && sessionUser
    ? "sell"
    : params.view === "messages" || params.view === "favorites" || params.view === "my-listings"
      ? params.view
      : "marketplace";

  return (
    <MarketplaceShell
      initialView={initialView}
      initialListings={listings}
      initialFavoriteListingIds={favoriteListingIds}
      initialConversations={conversations}
      initialMyListings={myListings}
      initialUser={sessionUser}
      shouldOpenAuth={params.auth === "1" || (params.sell === "1" && !sessionUser)}
    />
  );
}
