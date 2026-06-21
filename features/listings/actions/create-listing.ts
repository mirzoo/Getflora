"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";
import {
  maxImageFiles,
  maxFlowersCount,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import { mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import {
  isListingColor,
  readCsv,
  readFreshnessScore,
  readOrderedImageUrls,
  readListingType,
  readPositiveNumber,
  readReceivedAt,
  readText,
} from "@/features/listings/utils/listing-form";
import { getUploadableImageFiles, uploadListingImage } from "@/services/storage/s3-storage";
import { checkRateLimit } from "@/services/rate-limit";
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

const saleListingLifetimeMs = 48 * 60 * 60 * 1000;
const auctionListingLifetimeMs = 2 * 60 * 60 * 1000;
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
  const formPrice = readPositiveNumber(formData, "price");
  const city = readText(formData, "city");
  const area = readText(formData, "area");
  const type = readListingType(formData);
  const price = type === "auction" ? 1 : formPrice;
  const flowersCount = readPositiveNumber(formData, "flowersCount") || 1;
  const freshnessScore = readFreshnessScore(formData);
  const receivedAt = readReceivedAt(formData);
  const flowerTypes = readCsv(formData, "flowerTypes");
  const colors = readCsv(formData, "colors").filter(isListingColor);
  const imageFiles = getUploadableImageFiles(formData);
  let imageUrls = readOrderedImageUrls(formData, { includeFallback: imageFiles.length === 0 });

  if (!sellerEmail || !sellerEmail.includes("@")) {
    return { ok: false, error: "В аккаунте должен быть указан email продавца." };
  }

  if (!title || !city || !area || (type === "sale" && !price)) {
    return { ok: false, error: type === "auction" ? "Добавьте название и город." : "Добавьте название, цену и город." };
  }

  const validationError = validateListingInput({
    title,
    description,
    price,
    city,
    area,
    flowersCount,
    flowerTypes,
  });

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const rateLimit = await checkRateLimit({
    scope: "listing-create",
    identifier: sessionUser.id,
    windowMs: createListingRateLimitWindowMs,
    max: createListingRateLimitMax,
  });

  if (!rateLimit.ok) {
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

      imageUrls = [...uploadedImageUrls, ...imageUrls].slice(0, maxImageFiles);
    }

    const listingLifetimeMs = type === "auction" ? auctionListingLifetimeMs : saleListingLifetimeMs;
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
        receivedAt,
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
        auctionBids: {
          select: {
            bidderId: true,
            amount: true,
            createdAt: true,
          },
          orderBy: [
            {
              amount: "desc",
            },
            {
              createdAt: "asc",
            },
          ],
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
  price,
  city,
  area,
  flowersCount,
  flowerTypes,
}: {
  title: string;
  description: string;
  price: number;
  city: string;
  area: string;
  flowersCount: number;
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

  if (price > maxListingPrice) {
    return "Проверьте цену — кажется, она слишком высокая.";
  }

  if (flowersCount > maxFlowersCount) {
    return "Проверьте количество цветов.";
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
    message.startsWith("Можно загрузить") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Общий размер фото") ||
    message.startsWith("Хранилище фото не настроено");
}
