export type ListingType = "sale" | "auction";
export type ListingStatus = "draft" | "active" | "sold" | "expired" | "blocked";
export type ListingColor =
  | "black"
  | "red"
  | "white"
  | "orange"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "pink";

export type ListingCardModel = {
  id: string;
  title: string;
  description: string;
  price: number;
  type: ListingType;
  status: ListingStatus;
  city: string;
  area: string;
  sellerName: string;
  sellerId?: string;
  publishedAgo: string;
  publishedAt?: string;
  freshnessScore: number;
  flowersCount: number;
  flowerTypes: string[];
  colors: ListingColor[];
  imageUrl: string;
  imageUrls?: string[];
  imageAlt: string;
  auctionEndsAt?: string;
  bidsCount?: number;
};
