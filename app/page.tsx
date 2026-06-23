import type { Metadata } from "next";

import { MarketplaceShell } from "@/features/marketplace/components/marketplace-shell";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";
import { getSessionUser } from "@/features/auth/services/current-user";
import { findCityNameByQueryParam } from "@/features/cities/data/cities";
import {
  getConversationPreviews,
  getOrCreateConversationForListing,
} from "@/features/chat/services/conversations-repository";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getflora.ru";
const homePageTitle = "Getflora — купить и продать свежие букеты";
const homePageDescription =
  "Getflora помогает покупать свежие букеты дешевле и продавать подаренные цветы, которым можно дать вторую жизнь.";

export const metadata: Metadata = {
  title: homePageTitle,
  description: homePageDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: homePageTitle,
    description: homePageDescription,
    url: "/",
  },
};

type HomePageProps = {
  searchParams: Promise<{
    auth?: string;
    account?: string;
    conversation?: string;
    buyer?: string;
    city?: string;
    listing?: string;
    sell?: string;
    view?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        url: appUrl,
        name: "Getflora",
        description: homePageDescription,
        inLanguage: "ru-RU",
      },
      {
        "@type": "Organization",
        "@id": `${appUrl}/#organization`,
        name: "Getflora",
        url: appUrl,
        logo: new URL("/favicon/favicon-96x96.png", appUrl).toString(),
        sameAs: ["https://t.me/getflora"],
      },
    ],
  };

  const sessionUser = await getSessionUser();
  const listings = await getMarketplaceListings(sessionUser?.id);
  const initialCity = findCityNameByQueryParam(params.city) ?? undefined;
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketplaceShell
        initialView={initialView}
        initialListings={listings}
        initialCity={initialCity}
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
    </>
  );
}
