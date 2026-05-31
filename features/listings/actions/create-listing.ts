"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";
import { mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import type { ListingCardModel, ListingColor, ListingType } from "@/types/listing";

type CreateListingResult =
  | {
      ok: true;
      listing: ListingCardModel;
    }
  | {
      ok: false;
      error: string;
    };

const fallbackImage =
  "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80";

export async function createListingAction(formData: FormData): Promise<CreateListingResult> {
  let sessionUser: Awaited<ReturnType<typeof requireCurrentUser>>;

  try {
    sessionUser = await requireCurrentUser();
  } catch {
    return {
      ok: false,
      error: "Чтобы опубликовать объявление, сначала войдите в аккаунт.",
    };
  }

  const sellerEmail = sessionUser.email;
  const title = readText(formData, "title");
  const description = readText(formData, "description") || "Продавец пока не добавил описание.";
  const price = readPositiveNumber(formData, "price");
  const city = readText(formData, "city");
  const area = readText(formData, "area");
  const type = readListingType(formData);
  const flowersCount = readPositiveNumber(formData, "flowersCount") || 1;
  const freshnessScore = readFreshnessScore(formData);
  const flowerTypes = readCsv(formData, "flowerTypes");
  const colors = readCsv(formData, "colors").filter(isListingColor);
  const imageUrls = readImageUrls(formData);

  if (!sellerEmail || !sellerEmail.includes("@")) {
    return { ok: false, error: "В аккаунте должен быть указан email продавца." };
  }

  if (!title || !price || !city || !area) {
    return { ok: false, error: "Заполните название, цену, город и район." };
  }

  try {
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        type: type === "auction" ? "AUCTION" : "SALE",
        city,
        area,
        sellerId: sessionUser.id,
        freshnessScore,
        flowersCount,
        flowerTypes: flowerTypes.length ? flowerTypes : ["Розы"],
        colors: colors.length ? colors : ["pink"],
        images: {
          create: imageUrls.map((imageUrl, index) => ({
            url: imageUrl,
            alt: title,
            order: index,
          })),
        },
      },
      include: {
        seller: true,
        images: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    revalidatePath("/");

    return {
      ok: true,
      listing: mapCreatedListingToCardModel(listing),
    };
  } catch (error) {
    console.error("Failed to create listing", error);
    return {
      ok: false,
      error: "Не удалось опубликовать объявление. Проверьте подключение к базе и попробуйте еще раз.",
    };
  }
}

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readPositiveNumber(formData: FormData, key: string) {
  const value = Number(formData.get(key) ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readFreshnessScore(formData: FormData) {
  const value = Number(formData.get("freshnessScore") ?? 90);

  if (!Number.isFinite(value)) {
    return 90;
  }

  return Math.min(100, Math.max(1, value));
}

function readCsv(formData: FormData, key: string) {
  return readText(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readImageUrls(formData: FormData) {
  const urls = readText(formData, "imageUrls")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);

  return urls.length ? urls : [fallbackImage];
}

function readListingType(formData: FormData): ListingType {
  return formData.get("type") === "auction" ? "auction" : "sale";
}

function isListingColor(color: string): color is ListingColor {
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
