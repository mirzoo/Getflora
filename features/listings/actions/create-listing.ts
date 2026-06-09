"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";
import { mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import {
  isListingColor,
  readCsv,
  readFreshnessScore,
  readImageUrls,
  readListingType,
  readPositiveNumber,
  readText,
} from "@/features/listings/utils/listing-form";
import { getUploadableImageFiles, uploadListingImage } from "@/services/storage/s3-storage";
import type { ListingCardModel } from "@/types/listing";

type CreateListingResult =
  | {
      ok: true;
      listing: ListingCardModel;
    }
  | {
      ok: false;
      error: string;
    };

const listingLifetimeMs = 48 * 60 * 60 * 1000;
const createListingRateLimitWindowMs = 60 * 60 * 1000;
const createListingRateLimitMax = 8;
const maxTitleLength = 120;
const maxDescriptionLength = 1000;
const maxLocationLength = 80;
const maxFlowerTypes = 12;
const maxFlowerTypeLength = 40;

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
  const imageFiles = getUploadableImageFiles(formData);
  let imageUrls = readImageUrls(formData, { includeFallback: imageFiles.length === 0 });

  if (!sellerEmail || !sellerEmail.includes("@")) {
    return { ok: false, error: "В аккаунте должен быть указан email продавца." };
  }

  if (!title || !price || !city || !area) {
    return { ok: false, error: "Заполните название, цену, город и район." };
  }

  const validationError = validateListingInput({
    title,
    description,
    city,
    area,
    flowerTypes,
  });

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const recentListingCount = await prisma.listing.count({
    where: {
      sellerId: sessionUser.id,
      createdAt: {
        gte: new Date(Date.now() - createListingRateLimitWindowMs),
      },
    },
  });

  if (recentListingCount >= createListingRateLimitMax) {
    return {
      ok: false,
      error: "Слишком много объявлений за короткое время. Попробуйте позже.",
    };
  }

  try {
    if (imageFiles.length) {
      const uploadedImageUrls = await Promise.all(
        imageFiles.map((file) => uploadListingImage({ file })),
      );

      imageUrls = [...uploadedImageUrls, ...imageUrls].slice(0, 10);
    }

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
        expiresAt: new Date(Date.now() + listingLifetimeMs),
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
      error: getSafeCreateListingError(error),
    };
  }
}

function validateListingInput({
  title,
  description,
  city,
  area,
  flowerTypes,
}: {
  title: string;
  description: string;
  city: string;
  area: string;
  flowerTypes: string[];
}) {
  if (title.length > maxTitleLength) {
    return "Название слишком длинное.";
  }

  if (description.length > maxDescriptionLength) {
    return "Описание слишком длинное.";
  }

  if (city.length > maxLocationLength || area.length > maxLocationLength) {
    return "Город или район слишком длинные.";
  }

  if (flowerTypes.length > maxFlowerTypes || flowerTypes.some((flower) => flower.length > maxFlowerTypeLength)) {
    return "Список цветов слишком длинный.";
  }

  return null;
}

function getSafeCreateListingError(error: unknown) {
  if (error instanceof Error && isSafeUploadError(error.message)) {
    return error.message;
  }

  return "Не удалось опубликовать объявление. Проверьте данные и попробуйте еще раз.";
}

function isSafeUploadError(message: string) {
  return message.startsWith("Загрузите фото") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Хранилище фото не настроено");
}
