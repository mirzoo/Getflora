import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";
import { devMoscowTestListings, mockListings } from "@/features/listings/data/mock-listings";
import { getListingImageDisplayUrl } from "@/services/storage/s3-storage";
import type { ListingCardModel, ListingColor, ListingStatus, ListingType } from "@/types/listing";

type DbListing = Awaited<ReturnType<typeof getDbListings>>[number];
const marketplaceListingsLimit = 60;
const soldListingMarketplaceRetentionMs = 2 * 24 * 60 * 60 * 1000;

export async function getMarketplaceListings(currentUserId?: string): Promise<ListingCardModel[]> {
  try {
    const userId = currentUserId ?? (await getSessionUser())?.id;
    const listings = await getDbListings();

    if (!listings.length && shouldUseMockListingsFallback()) {
      return getDevelopmentListings(mockListings);
    }

    return getDevelopmentListings(listings.map((listing) => mapDbListingToCardModel(listing, userId)));
  } catch (error) {
    console.warn("Failed to read marketplace listings.", error);
    return shouldUseMockListingsFallback() ? getDevelopmentListings(mockListings) : [];
  }
}

export async function getMyListings(): Promise<ListingCardModel[]> {
  try {
    const user = await getSessionUser();

    if (!user) {
      return [];
    }

    const soldListingCutoff = new Date(Date.now() - soldListingMarketplaceRetentionMs);
    const listings = await prisma.listing.findMany({
      where: {
        sellerId: user.id,
        OR: [
          {
            status: "ACTIVE",
          },
          {
            status: "BLOCKED",
          },
          {
            status: "EXPIRED",
          },
          {
            status: "SOLD",
            soldAt: {
              gte: soldListingCutoff,
            },
          },
        ],
      },
      include: dbListingInclude,
      orderBy: {
        updatedAt: "desc",
      },
    });

    return listings.map((listing) => mapDbListingToCardModel(listing, user.id));
  } catch (error) {
    console.warn("Failed to read current user listings.", error);
    return [];
  }
}

function getDbListings(where: { sellerId?: string } = {}) {
  const soldListingCutoff = new Date(Date.now() - soldListingMarketplaceRetentionMs);

  return prisma.listing.findMany({
    where: {
      sellerId: where.sellerId,
      OR: [
        {
          status: "ACTIVE",
        },
        {
          type: "AUCTION",
          status: "EXPIRED",
          archivedAt: {
            gte: soldListingCutoff,
          },
        },
        {
          status: "SOLD",
          soldAt: {
            gte: soldListingCutoff,
          },
        },
      ],
    },
    include: dbListingInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: marketplaceListingsLimit,
  });
}

const dbListingInclude = {
  seller: {
    select: {
      name: true,
    },
  },
  images: {
    orderBy: {
      order: "asc" as const,
    },
  },
  auctionBids: {
    select: {
      bidderId: true,
      amount: true,
      createdAt: true,
    },
    orderBy: [
      {
        amount: "desc" as const,
      },
      {
        createdAt: "asc" as const,
      },
    ],
  },
};

function mapDbListingToCardModel(listing: DbListing, currentUserId?: string): ListingCardModel {
  const firstImage = listing.images[0];
  const imageUrls = listing.images.map((image) => getListingImageDisplayUrl(image.url));
  const topBid = listing.auctionBids[0];
  const userBid = currentUserId
    ? listing.auctionBids.find((bid) => bid.bidderId === currentUserId)
    : undefined;
  const auctionCurrentBid = topBid?.amount;
  const auctionEnded = listing.type === "AUCTION" && Boolean(
    listing.status === "EXPIRED" ||
    listing.status === "SOLD" ||
    (listing.expiresAt && listing.expiresAt <= new Date()),
  );

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    type: mapListingType(listing.type),
    status: mapListingStatus(listing.status),
    city: listing.city,
    area: listing.area,
    sellerName: listing.seller.name,
    sellerId: listing.sellerId,
    publishedAgo: "",
    publishedAt: listing.createdAt.toISOString(),
    soldAt: listing.soldAt?.toISOString(),
    freshnessScore: listing.freshnessScore,
    receivedAt: listing.receivedAt.toISOString(),
    flowersCount: listing.flowersCount,
    flowerTypes: listing.flowerTypes,
    colors: listing.colors.filter(isListingColor),
    imageUrl: firstImage ? getListingImageDisplayUrl(firstImage.url) : mockListings[0].imageUrl,
    imageUrls: imageUrls.length ? imageUrls : [mockListings[0].imageUrl],
    imageAlt: firstImage?.alt ?? listing.title,
    auctionEndsAt: listing.type === "AUCTION" ? listing.expiresAt?.toISOString() : undefined,
    auctionStartPrice: listing.type === "AUCTION" ? listing.price : undefined,
    auctionCurrentBid: listing.type === "AUCTION" ? auctionCurrentBid : undefined,
    auctionUserBid: listing.type === "AUCTION" ? userBid?.amount : undefined,
    auctionUserBidStatus: listing.type === "AUCTION" && userBid
      ? userBid.amount >= auctionCurrentBid
        ? "winning"
        : "outbid"
      : undefined,
    auctionEnded: listing.type === "AUCTION" ? auctionEnded : undefined,
    auctionWinnerId: listing.type === "AUCTION" ? topBid?.bidderId : undefined,
    bidsCount: listing.type === "AUCTION" ? listing.auctionBids.length : undefined,
  };
}

export function mapCreatedListingToCardModel(listing: DbListing, currentUserId?: string): ListingCardModel {
  return mapDbListingToCardModel(listing, currentUserId);
}

function mapListingType(type: DbListing["type"]): ListingType {
  return type === "AUCTION" ? "auction" : "sale";
}

function mapListingStatus(status: DbListing["status"]): ListingStatus {
  return status.toLowerCase() as ListingStatus;
}

function isListingColor(color: string): color is ListingColor {
  return [
    "black",
    "red",
    "white",
    "orange",
    "green",
    "cyan",
    "blue",
    "purple",
    "pink",
  ].includes(color);
}

function shouldUseMockListingsFallback() {
  return process.env.NODE_ENV !== "production";
}

function getDevelopmentListings(listings: ListingCardModel[]) {
  if (process.env.NODE_ENV === "production") {
    return listings;
  }

  const hasActiveAuction = listings.some((listing) =>
    listing.type === "auction" && listing.status === "active"
  );
  const auctionTestListings = hasActiveAuction
    ? []
    : mockListings.filter((listing) => listing.type === "auction" && listing.status === "active");

  return [...listings, ...auctionTestListings, ...devMoscowTestListings];
}
