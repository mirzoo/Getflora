import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";
import { getFavoriteListingIds } from "@/features/favorites/services/favorites-repository";
import { getSessionUser } from "@/features/auth/services/current-user";

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

  const [listings, favoriteListingIds, sessionUser] = await Promise.all([
    getMarketplaceListings(),
    getFavoriteListingIds(),
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
      initialUser={sessionUser}
      shouldOpenAuth={params.auth === "1" || (params.account === "1" && !sessionUser) || (params.sell === "1" && !sessionUser)}
      shouldOpenAccount={params.account === "1" && Boolean(sessionUser)}
    />
  );
}
