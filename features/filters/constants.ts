import type { ListingColor, ListingType } from "@/types/listing";
import type { ListingSort } from "@/types/filters";

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
  { label: "По дате", value: "date" },
  { label: "По свежести", value: "freshness" },
  { label: "Сначала дорогие", value: "price-desc" },
  { label: "Сначала дешевые", value: "price-asc" },
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

export const freshnessOptions = [90, 80, 70, 50, 40, 30];

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
