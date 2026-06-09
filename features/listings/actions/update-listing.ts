"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";
import {
  maxFlowersCount,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import { mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import {
  isListingColor,
  readCsv,
  readImageUrls,
  readPositiveNumber,
  readText,
} from "@/features/listings/utils/listing-form";
import {
  deleteListingImages,
  getUploadableImageFiles,
  uploadListingImage,
} from "@/services/storage/s3-storage";
import type { ListingCardModel } from "@/types/listing";

type UpdateListingResult =
  | {
      ok: true;
      listing: ListingCardModel;
    }
  | {
      ok: false;
      error: string;
    };

const maxDescriptionLength = 1000;
const maxLocationLength = 80;
const maxFlowerTypes = 12;
const maxFlowerTypeLength = 40;

export async function updateListingAction(formData: FormData): Promise<UpdateListingResult> {
  let user: Awaited<ReturnType<typeof requireCurrentUser>>;

  try {
    user = await requireCurrentUser();
  } catch {
    return {
      ok: false,
      error: "Чтобы редактировать объявление, сначала войдите в аккаунт.",
    };
  }

  const listingId = readText(formData, "listingId");
  const price = readPositiveNumber(formData, "price");
  const area = readText(formData, "area");
  const description = readText(formData, "description") || "Продавец пока не добавил описание.";
  const flowersCount = readPositiveNumber(formData, "flowersCount") || 1;
  const flowerTypes = readCsv(formData, "flowerTypes");
  const colors = readCsv(formData, "colors").filter(isListingColor);
  const imageFiles = getUploadableImageFiles(formData);
  let imageUrls = readImageUrls(formData, { includeFallback: false });

  if (!listingId) {
    return { ok: false, error: "Не удалось определить объявление для редактирования." };
  }

  if (!price || !area) {
    return { ok: false, error: "Заполните цену и район." };
  }

  const validationError = validateListingUpdateInput({
    price,
    description,
    area,
    flowersCount,
    flowerTypes,
  });

  if (validationError) {
    return { ok: false, error: validationError };
  }

  const existingListing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      sellerId: user.id,
    },
    select: {
      id: true,
      status: true,
      images: {
        select: {
          url: true,
        },
      },
    },
  });

  if (!existingListing) {
    return {
      ok: false,
      error: "Объявление не найдено или принадлежит другому пользователю.",
    };
  }

  if (existingListing.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Можно редактировать только активные объявления.",
    };
  }

  try {
    if (imageFiles.length) {
      const uploadedImageUrls = await Promise.all(
        imageFiles.map((file) => uploadListingImage({ file })),
      );

      imageUrls = [...imageUrls, ...uploadedImageUrls].slice(0, 10);
    }

    if (!imageUrls.length) {
      return {
        ok: false,
        error: "Добавьте хотя бы одно фото или оставьте старую ссылку.",
      };
    }

    const listing = await prisma.$transaction(async (tx) => {
      await tx.listingImage.deleteMany({
        where: {
          listingId,
        },
      });

      return tx.listing.update({
        where: {
          id: listingId,
        },
        data: {
          price,
          area,
          description,
          flowersCount,
          flowerTypes: flowerTypes.length ? flowerTypes : ["Розы"],
          colors: colors.length ? colors : ["pink"],
          images: {
            create: imageUrls.map((imageUrl, index) => ({
              url: imageUrl,
              alt: undefined,
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
    });

    await deleteListingImages(
      existingListing.images.map((image) => image.url),
      imageUrls,
    );

    revalidatePath("/");

    return {
      ok: true,
      listing: mapCreatedListingToCardModel(listing),
    };
  } catch (error) {
    console.error("Failed to update listing", error);
    return {
      ok: false,
      error: getSafeUpdateListingError(error),
    };
  }
}

function validateListingUpdateInput({
  price,
  description,
  area,
  flowersCount,
  flowerTypes,
}: {
  price: number;
  description: string;
  area: string;
  flowersCount: number;
  flowerTypes: string[];
}) {
  if (description.length > maxDescriptionLength) {
    return "Описание слишком длинное.";
  }

  if (area.length > maxLocationLength) {
    return "Район слишком длинный.";
  }

  if (price > maxListingPrice) {
    return "Цена слишком большая.";
  }

  if (flowersCount > maxFlowersCount) {
    return "Количество цветов слишком большое.";
  }

  if (flowerTypes.length > maxFlowerTypes || flowerTypes.some((flower) => flower.length > maxFlowerTypeLength)) {
    return "Список цветов слишком длинный.";
  }

  return null;
}

function getSafeUpdateListingError(error: unknown) {
  if (error instanceof Error && isSafeUploadError(error.message)) {
    return error.message;
  }

  return "Не удалось сохранить изменения. Проверьте данные и попробуйте еще раз.";
}

function isSafeUploadError(message: string) {
  return message.startsWith("Загрузите фото") ||
    message.startsWith("Можно загрузить") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Общий размер фото") ||
    message.startsWith("Хранилище фото не настроено");
}
