"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireAdminAction } from "@/features/admin/services/admin-auth";
import {
  maxFlowersCount,
  maxImageFiles,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import {
  isListingColor,
  readCsv,
  readFreshnessScore,
  readPositiveNumber,
  readReceivedAt,
  readText,
} from "@/features/listings/utils/listing-form";
import { getUploadableImageFiles, uploadListingImage } from "@/services/storage/s3-storage";

type CreateDemoListingResult =
  | {
      ok: true;
      listingId: string;
    }
  | {
      ok: false;
      error: string;
    };

const saleListingLifetimeMs = 48 * 60 * 60 * 1000;
const maxTitleLength = 120;
const maxDescriptionLength = 1000;
const maxLocationLength = 80;
const maxFlowerTypes = 12;
const maxFlowerTypeLength = 40;
const demoSellerEmailDomain = "getflora.local";

export async function createDemoListingAction(formData: FormData): Promise<CreateDemoListingResult> {
  try {
    await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const sellerName = readText(formData, "sellerName");
  const sellerSlug = normalizeSellerSlug(readText(formData, "sellerSlug") || sellerName);
  const title = readText(formData, "title");
  const description = readText(formData, "description") || "Продавец пока не добавил описание.";
  const price = readPositiveNumber(formData, "price");
  const city = readText(formData, "city");
  const area = readText(formData, "area") || "Не указан";
  const status = readText(formData, "status") === "sold" ? "SOLD" : "ACTIVE";
  const flowersCount = readPositiveNumber(formData, "flowersCount") || 1;
  const freshnessScore = readFreshnessScore(formData);
  const receivedAt = readReceivedAt(formData);
  const flowerTypes = readCsv(formData, "flowerTypes");
  const colors = formData
    .getAll("colors")
    .map((value) => String(value ?? "").trim())
    .filter(isListingColor);

  if (!sellerName || !sellerSlug) {
    return { ok: false, error: "Добавьте имя и короткий slug витринного продавца." };
  }

  if (!title || !price || !city) {
    return { ok: false, error: "Добавьте название, цену и город." };
  }

  const validationError = validateDemoListingInput({
    sellerName,
    sellerSlug,
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

  let imageFiles: File[];

  try {
    imageFiles = getUploadableImageFiles(formData);
  } catch (error) {
    return { ok: false, error: getSafeCreateDemoListingError(error) };
  }

  if (!imageFiles.length) {
    return { ok: false, error: "Загрузите хотя бы одно фото букета." };
  }

  try {
    const imageUrls = await Promise.all(
      imageFiles.slice(0, maxImageFiles).map((file) =>
        uploadListingImage({
          file,
          folder: "admin-demo-listing-images",
        }),
      ),
    );
    const sellerEmail = `demo+${sellerSlug}@${demoSellerEmailDomain}`;
    const seller = await prisma.user.upsert({
      where: {
        email: sellerEmail,
      },
      create: {
        name: sellerName,
        email: sellerEmail,
        emailVerifiedAt: new Date(),
      },
      update: {
        name: sellerName,
      },
      select: {
        id: true,
      },
    });
    const now = new Date();
    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        type: "SALE",
        status,
        city,
        area,
        sellerId: seller.id,
        freshnessScore,
        receivedAt,
        flowersCount,
        flowerTypes: flowerTypes.length ? flowerTypes : ["Розы"],
        colors: colors.length ? colors : ["pink"],
        soldAt: status === "SOLD" ? now : null,
        expiresAt: status === "ACTIVE" ? new Date(Date.now() + saleListingLifetimeMs) : null,
        images: {
          create: imageUrls.map((imageUrl, index) => ({
            url: imageUrl,
            alt: title,
            order: index,
          })),
        },
      },
      select: {
        id: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/admin/listings");

    return {
      ok: true,
      listingId: listing.id,
    };
  } catch (error) {
    console.error("Failed to create demo listing.", error);
    return {
      ok: false,
      error: getSafeCreateDemoListingError(error),
    };
  }
}

function validateDemoListingInput({
  sellerName,
  sellerSlug,
  title,
  description,
  price,
  city,
  area,
  flowersCount,
  flowerTypes,
}: {
  sellerName: string;
  sellerSlug: string;
  title: string;
  description: string;
  price: number;
  city: string;
  area: string;
  flowersCount: number;
  flowerTypes: string[];
}) {
  if (sellerName.length > 80 || sellerSlug.length > 40) {
    return "Имя или slug продавца слишком длинные.";
  }

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

function normalizeSellerSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "e")
    .replace(/[а-я]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function getSafeCreateDemoListingError(error: unknown) {
  if (error instanceof Error && isSafeUploadError(error.message)) {
    return error.message;
  }

  return "Не удалось создать витринное объявление. Проверьте данные и попробуйте ещё раз.";
}

function isSafeUploadError(message: string) {
  return message.startsWith("Загрузите фото") ||
    message.startsWith("Можно загрузить") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Общий размер фото") ||
    message.startsWith("Хранилище фото не настроено");
}
