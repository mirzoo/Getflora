import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";
import { getSessionUser } from "@/features/auth/services/current-user";

export const dynamic = "force-dynamic";

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
    : params.view === "messages" || params.view === "my-listings"
      ? params.view
      : "marketplace";

  return (
    <MarketplaceShell
      initialView={initialView}
      initialListings={listings}
      initialUser={sessionUser}
      shouldOpenAuth={params.auth === "1" || (params.account === "1" && !sessionUser) || (params.sell === "1" && !sessionUser)}
    />
  );
}
