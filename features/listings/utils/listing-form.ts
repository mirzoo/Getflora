import type { ListingColor, ListingType } from "@/types/listing";

export const fallbackListingImage =
  "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80";

export function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readPositiveNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function readFreshnessScore(formData: FormData) {
  const value = Number(formData.get("freshnessScore") ?? 90);

  if (!Number.isFinite(value)) {
    return 90;
  }

  return Math.min(100, Math.max(1, value));
}

export function readCsv(formData: FormData, key: string) {
  return readText(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readImageUrls(
  formData: FormData,
  options: {
    includeFallback?: boolean;
  } = {},
) {
  const urls = formData
    .getAll("imageUrls")
    .flatMap((value) => String(value ?? "").split(/[\n,]+/))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (urls.length) {
    return urls;
  }

  return options.includeFallback === false ? [] : [fallbackListingImage];
}

export function readListingType(formData: FormData): ListingType {
  return formData.get("type") === "auction" ? "auction" : "sale";
}

export function isListingColor(color: string): color is ListingColor {
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
