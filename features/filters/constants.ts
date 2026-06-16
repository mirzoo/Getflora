import type { ListingColor, ListingType } from "@/types/listing";
import type { ListingSort } from "@/types/filters";
import { listingFreshnessScale } from "@/features/listings/utils/freshness";

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

export const freshnessOptions = listingFreshnessScale;

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
