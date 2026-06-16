import type { ListingFreshnessFilter } from "@/types/filters";

export const listingFreshnessScale: Array<{
  label: string;
  value: ListingFreshnessFilter;
  minScore: number;
  maxScoreExclusive?: number;
  ageDays?: number;
}> = [
  { label: "Новый", value: "like-new", minScore: 90, ageDays: 0 },
  { label: "Свежий", value: "very-fresh", minScore: 80, maxScoreExclusive: 90, ageDays: 1 },
  { label: "Хороший", value: "fresh", minScore: 70, maxScoreExclusive: 80, ageDays: 2 },
  { label: "Теряет свежесть", value: "last-days", minScore: 60, maxScoreExclusive: 70, ageDays: 3 },
  { label: "Немного вянут", value: "wilting", minScore: 50, maxScoreExclusive: 60, ageDays: 4 },
  { label: "Увядшие", value: "wilted", minScore: 0, maxScoreExclusive: 50 },
];

export function getReceivedAgeDays(receivedAt?: string | Date | null) {
  if (!receivedAt) {
    return null;
  }

  const receivedDate = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);

  if (Number.isNaN(receivedDate.getTime())) {
    return null;
  }

  const todayStart = getLocalDayStart(new Date());
  const receivedStart = getLocalDayStart(receivedDate);
  const ageDays = Math.floor((todayStart.getTime() - receivedStart.getTime()) / 86_400_000);

  return Math.max(0, ageDays);
}

export function getFreshnessLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  return `Получен ${getFreshnessValueLabel(receivedAt, freshnessScore).toLocaleLowerCase("ru-RU")}`;
}

export function getFreshnessValueLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const ageDays = getReceivedAgeDays(receivedAt);

  if (ageDays !== null) {
    return getReceivedAgeLabel(ageDays);
  }

  if (freshnessScore >= 90) {
    return "Сегодня";
  }

  if (freshnessScore >= 80) {
    return "Вчера";
  }

  if (freshnessScore >= 70) {
    return "2 дня назад";
  }

  return "3+ дня назад";
}

export function getCompactFreshnessLabel(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  return getFreshnessOption(receivedAt, freshnessScore).label;
}

export function getFreshnessTone(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const option = getFreshnessOption(receivedAt, freshnessScore);

  if (option.value === "like-new") {
    return "today";
  }

  if (option.value === "very-fresh") {
    return "yesterday";
  }

  if (option.value === "fresh") {
    return "two-days";
  }

  return "older";
}

export function matchesFreshnessFilter(
  receivedAt: string | Date | null | undefined,
  freshnessScore: number,
  filter: ListingFreshnessFilter | null,
) {
  if (!filter) {
    return true;
  }

  return getFreshnessOption(receivedAt, freshnessScore).value === filter;
}

export function getFreshnessOption(receivedAt: string | Date | null | undefined, freshnessScore: number) {
  const ageDays = getReceivedAgeDays(receivedAt);

  if (ageDays !== null) {
    return listingFreshnessScale.find((option) => option.ageDays === ageDays) ?? listingFreshnessScale[5];
  }

  return listingFreshnessScale.find((option) => {
    const belowMax = option.maxScoreExclusive === undefined || freshnessScore < option.maxScoreExclusive;

    return freshnessScore >= option.minScore && belowMax;
  }) ?? listingFreshnessScale[5];
}

function getLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getReceivedAgeLabel(ageDays: number) {
  if (ageDays === 0) {
    return "Сегодня";
  }

  if (ageDays === 1) {
    return "Вчера";
  }

  if (ageDays === 2) {
    return "2 дня назад";
  }

  if (ageDays === 3) {
    return "3 дня назад";
  }

  if (ageDays === 4) {
    return "4 дня назад";
  }

  return "5+ дней назад";
}
