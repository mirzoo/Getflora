import type { ListingColor, ListingType } from "@/types/listing";
import { maxImageFiles } from "@/features/listings/constants/listing-limits";

export const fallbackListingImage =
  "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80";

export function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function readPositiveNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  // Цена и количество хранятся как Int — дробные значения отклоняем.
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export function readFreshnessScore(formData: FormData) {
  const value = Number(formData.get("freshnessScore") ?? 90);

  if (!Number.isFinite(value)) {
    return 90;
  }

  return Math.min(100, Math.max(1, value));
}

export function readReceivedAt(formData: FormData) {
  const daysAgo = Number(formData.get("receivedDaysAgo") ?? 0);
  const safeDaysAgo = Number.isFinite(daysAgo) ? Math.min(30, Math.max(0, Math.floor(daysAgo))) : 0;
  const receivedAt = new Date();

  receivedAt.setHours(12, 0, 0, 0);
  receivedAt.setDate(receivedAt.getDate() - safeDaysAgo);

  return receivedAt;
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
    .slice(0, maxImageFiles);

  if (urls.length) {
    return urls;
  }

  return options.includeFallback === false ? [] : [fallbackListingImage];
}

export function readOrderedImageUrls(
  formData: FormData,
  options: {
    includeFallback?: boolean;
  } = {},
) {
  const imageUrls = readImageUrls(formData, {
    includeFallback: false,
  });
  const imageOrder = formData
    .getAll("imageOrder")
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  if (!imageUrls.length || !imageOrder.length) {
    return imageUrls.length ? imageUrls : (options.includeFallback === false ? [] : [fallbackListingImage]);
  }

  const orderedExistingUrls = imageOrder
    .filter((item) => item.startsWith("existing:"))
    .map((item) => item.slice("existing:".length));
  const existingQueue = [...imageUrls];
  const uploadedQueue = imageUrls.filter((url) => !orderedExistingUrls.includes(url));
  const orderedUrls = imageOrder.flatMap((item) => {
    if (item.startsWith("existing:")) {
      const url = item.slice("existing:".length);
      const index = existingQueue.indexOf(url);

      if (index === -1) {
        return [];
      }

      existingQueue.splice(index, 1);

      return [url];
    }

    if (item.startsWith("pending:")) {
      const uploadedUrl = uploadedQueue.shift();

      return uploadedUrl ? [uploadedUrl] : [];
    }

    return [];
  });

  const result = [...orderedUrls, ...uploadedQueue].slice(0, maxImageFiles);

  if (result.length) {
    return result;
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
