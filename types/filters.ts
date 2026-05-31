import type { ListingColor, ListingType } from "@/types/listing";

export type ListingSort = "date" | "freshness" | "price-desc" | "price-asc";

export type MarketplaceFiltersState = {
  listingType: ListingType | "all";
  sort: ListingSort;
  flowerTypes: string[];
  minPrice: string;
  maxPrice: string;
  colors: ListingColor[];
  minFreshness: number | null;
};
