import type { ListingColor, ListingType } from "@/types/listing";

export type ListingSort = "date" | "date-asc" | "price-desc" | "price-asc";
export type ListingFreshnessFilter = "like-new" | "very-fresh" | "fresh" | "last-days";

export type MarketplaceFiltersState = {
  listingType: ListingType | "all";
  sort: ListingSort;
  flowerTypes: string[];
  minPrice: string;
  maxPrice: string;
  colors: ListingColor[];
  freshness: ListingFreshnessFilter | null;
};
