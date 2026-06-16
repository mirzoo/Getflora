import type { ListingType } from "@/types/listing";

export type RecommendedListingPriceInput = {
  city: string;
  flowerTypes: string[];
  flowersCount: number;
  receivedDaysAgo: number;
  listingType: ListingType;
};

export type RecommendedListingPrice = {
  low: number;
  high: number;
  retailAnchor: number;
};

const fallbackStemRetailPrice = 220;
const bouquetWorkBasePrice = 700;

const stemRetailPrices: Record<string, number> = {
  Розы: 220,
  Пионы: 550,
  Тюльпаны: 140,
  Хризантемы: 170,
  Гортензии: 650,
  Лилии: 420,
  Эустомы: 260,
  Ирисы: 180,
  Герберы: 180,
  Орхидеи: 520,
  Эвкалипт: 150,
  Ромашки: 120,
  Гладиолус: 180,
};

const cityMultipliers: Record<string, number> = {
  Москва: 1.25,
  "Санкт-Петербург": 1.15,
  Сочи: 1.12,
  Владивосток: 1.1,
  Сургут: 1.1,
  Якутск: 1.1,
  "Южно-Сахалинск": 1.1,
  Екатеринбург: 1.05,
  Казань: 1.05,
  Краснодар: 1.05,
  Новосибирск: 1.05,
  "Нижний Новгород": 1.02,
  Самара: 1.02,
  Уфа: 1.02,
  Красноярск: 1.02,
  "Ростов-на-Дону": 1.02,
};

export function getRecommendedListingPrice({
  city,
  flowerTypes,
  flowersCount,
  receivedDaysAgo,
  listingType,
}: RecommendedListingPriceInput): RecommendedListingPrice | null {
  if (!Number.isFinite(flowersCount) || flowersCount <= 0) {
    return null;
  }

  const safeFlowersCount = Math.min(201, Math.max(1, Math.floor(flowersCount)));
  const cityMultiplier = cityMultipliers[city] ?? 0.92;
  const averageStemPrice = getAverageStemRetailPrice(flowerTypes);
  const retailAnchor = roundToNearestHundred(
    (averageStemPrice * safeFlowersCount + bouquetWorkBasePrice) * cityMultiplier,
  );
  const resalePrice = retailAnchor * getFreshnessResaleMultiplier(receivedDaysAgo);
  const listingTypeMultiplier = listingType === "auction" ? 0.82 : 1;
  const targetPrice = resalePrice * listingTypeMultiplier;
  const rangeMultiplier = listingType === "auction"
    ? { low: 0.78, high: 1 }
    : { low: 0.88, high: 1.14 };

  return {
    low: Math.max(300, roundToNearestHundred(targetPrice * rangeMultiplier.low)),
    high: Math.max(500, roundToNearestHundred(targetPrice * rangeMultiplier.high)),
    retailAnchor,
  };
}

function getAverageStemRetailPrice(flowerTypes: string[]) {
  const selectedFlowers = flowerTypes.length ? flowerTypes : ["Розы"];
  const total = selectedFlowers.reduce(
    (sum, flowerType) => sum + (stemRetailPrices[flowerType] ?? fallbackStemRetailPrice),
    0,
  );

  return total / selectedFlowers.length;
}

function getFreshnessResaleMultiplier(receivedDaysAgo: number) {
  if (receivedDaysAgo <= 0) {
    return 0.68;
  }

  if (receivedDaysAgo === 1) {
    return 0.56;
  }

  if (receivedDaysAgo === 2) {
    return 0.44;
  }

  if (receivedDaysAgo === 3) {
    return 0.32;
  }

  return 0.22;
}

function roundToNearestHundred(value: number) {
  return Math.round(value / 100) * 100;
}
