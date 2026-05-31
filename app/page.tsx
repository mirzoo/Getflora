import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
    sell?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const initialView = params.view === "messages" || params.view === "favorites"
    ? params.view
    : "marketplace";

  return (
    <MarketplaceShell
      initialView={initialView}
      shouldOpenAuth={params.auth === "1"}
      shouldOpenSell={params.sell === "1"}
    />
  );
}
