import type { ListingColor, ListingType } from "@/types/listing";
import type { ListingFreshnessFilter, ListingSort } from "@/types/filters";

export const listingTypeOptions: Array<{
  label: string;
  value: ListingType | "all";
}> = [
  { label: "Продажа", value: "sale" },
  { label: "Аукционы", value: "auction" },
];

export const sortOptions: Array<{
  label: string;
  value: ListingSort;
}> = [
  { label: "Сначала недавние", value: "date" },
  { label: "Сначала старые", value: "date-asc" },
  { label: "Сначала дешевые", value: "price-asc" },
  { label: "Сначала дорогие", value: "price-desc" },
];

export const flowerTypeOptions = [
  "Розы",
  "Пионы",
  "Ромашки",
  "Гладиолус",
  "Эвкалипт",
  "Тюльпаны",
  "Хризантемы",
];

export const freshnessOptions: Array<{
  label: string;
  value: ListingFreshnessFilter;
  minScore: number;
  maxScoreExclusive?: number;
}> = [
  { label: "Новый", value: "like-new", minScore: 90 },
  { label: "Свежий", value: "very-fresh", minScore: 80, maxScoreExclusive: 90 },
  { label: "Хороший", value: "fresh", minScore: 70, maxScoreExclusive: 80 },
  { label: "Теряет свежесть", value: "last-days", minScore: 60, maxScoreExclusive: 70 },
  { label: "Немного вянут", value: "wilting", minScore: 50, maxScoreExclusive: 60 },
  { label: "Увядшие", value: "wilted", minScore: 0, maxScoreExclusive: 50 },
];

export const colorOptions: Array<{
  label: string;
  value: ListingColor;
  className: string;
}> = [
  { label: "Черный", value: "black", className: "bg-black" },
  { label: "Красный", value: "red", className: "bg-red-500" },
  { label: "Белый", value: "white", className: "bg-white" },
  { label: "Оранжевый", value: "orange", className: "bg-orange-400" },
  { label: "Зеленый", value: "green", className: "bg-green-500" },
  { label: "Голубой", value: "cyan", className: "bg-cyan-400" },
  { label: "Синий", value: "blue", className: "bg-blue-600" },
  { label: "Фиолетовый", value: "purple", className: "bg-fuchsia-500" },
  { label: "Розовый", value: "pink", className: "bg-pink-400" },
];
