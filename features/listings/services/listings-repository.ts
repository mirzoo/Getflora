import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";
import { devMoscowTestListings, mockListings } from "@/features/listings/data/mock-listings";
import { getListingImageDisplayUrl } from "@/services/storage/s3-storage";
import type { ListingCardModel, ListingColor, ListingStatus, ListingType } from "@/types/listing";

type DbListing = Awaited<ReturnType<typeof getDbListings>>[number];
const marketplaceListingsLimit = 60;

export async function getMarketplaceListings(): Promise<ListingCardModel[]> {
  try {
    const listings = await getDbListings();

    if (!listings.length && shouldUseMockListingsFallback()) {
      return getDevelopmentListings(mockListings);
    }

    return getDevelopmentListings(listings.map(mapDbListingToCardModel));
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

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
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
              gte: dayAgo,
            },
          },
        ],
      },
      include: dbListingInclude,
      orderBy: {
        updatedAt: "desc",
      },
    });

    return listings.map(mapDbListingToCardModel);
  } catch (error) {
    console.warn("Failed to read current user listings.", error);
    return [];
  }
}

function getDbListings(where: { sellerId?: string } = {}) {
  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      sellerId: where.sellerId,
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
};

function mapDbListingToCardModel(listing: DbListing): ListingCardModel {
  const firstImage = listing.images[0];
  const imageUrls = listing.images.map((image) => getListingImageDisplayUrl(image.url));

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
    freshnessScore: listing.freshnessScore,
    receivedAt: listing.receivedAt.toISOString(),
    flowersCount: listing.flowersCount,
    flowerTypes: listing.flowerTypes,
    colors: listing.colors.filter(isListingColor),
    imageUrl: firstImage ? getListingImageDisplayUrl(firstImage.url) : mockListings[0].imageUrl,
    imageUrls: imageUrls.length ? imageUrls : [mockListings[0].imageUrl],
    imageAlt: firstImage?.alt ?? listing.title,
  };
}

export function mapCreatedListingToCardModel(listing: DbListing): ListingCardModel {
  return mapDbListingToCardModel(listing);
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

  return [...listings, ...devMoscowTestListings];
}
