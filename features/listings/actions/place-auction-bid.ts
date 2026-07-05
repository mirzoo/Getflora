"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";
import { maxListingPrice } from "@/features/listings/constants/listing-limits";
import { dbListingInclude, mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import { readPositiveNumber, readText } from "@/features/listings/utils/listing-form";
import { checkRateLimit } from "@/services/rate-limit";
import type { ListingCardModel } from "@/types/listing";

type PlaceAuctionBidResult =
  | {
      ok: true;
      listing: ListingCardModel;
    }
  | {
      ok: false;
      error: string;
    };

const auctionBidRateLimitWindowMs = 60 * 1000;
const auctionBidRateLimitMax = 20;

export async function placeAuctionBidAction(formData: FormData): Promise<PlaceAuctionBidResult> {
  let user: Awaited<ReturnType<typeof requireCurrentUser>>;

  try {
    user = await requireCurrentUser();
  } catch {
    return {
      ok: false,
      error: "Чтобы сделать ставку, сначала войдите в аккаунт.",
    };
  }

  const listingId = readText(formData, "listingId");
  const amount = readPositiveNumber(formData, "amount");

  if (!listingId || !amount) {
    return {
      ok: false,
      error: "Укажите сумму ставки.",
    };
  }

  if (amount > maxListingPrice) {
    return {
      ok: false,
      error: `Максимальная ставка — ${maxListingPrice.toLocaleString("ru-RU")} ₽.`,
    };
  }

  const rateLimit = await checkRateLimit({
    scope: "auction-bid",
    identifier: user.id,
    windowMs: auctionBidRateLimitWindowMs,
    max: auctionBidRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много ставок за короткое время. Попробуйте позже.",
    };
  }

  try {
    const listing = await prisma.$transaction(async (tx) => {
      // Блокируем строку объявления, чтобы параллельные ставки
      // не проходили проверку "больше текущей" одновременно.
      await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;

      const currentListing = await tx.listing.findUnique({
        where: {
          id: listingId,
        },
        include: dbListingInclude,
      });

      if (!currentListing) {
        throw new AuctionBidError("Объявление не найдено. Обновите страницу и попробуйте ещё раз.");
      }

      if (currentListing.type !== "AUCTION") {
        throw new AuctionBidError("Ставки доступны только для аукционов.");
      }

      if (currentListing.status !== "ACTIVE") {
        throw new AuctionBidError("Аукцион уже не активен.");
      }

      if (currentListing.sellerId === user.id) {
        throw new AuctionBidError("Нельзя делать ставку на своё объявление.");
      }

      if (currentListing.expiresAt && currentListing.expiresAt <= new Date()) {
        throw new AuctionBidError("Аукцион уже завершён.");
      }

      const currentBid = currentListing.auctionBids[0]?.amount;

      if (currentBid && amount <= currentBid) {
        throw new AuctionBidError(`Ставка должна быть больше ${currentBid.toLocaleString("ru-RU")} ₽.`);
      }

      await tx.auctionBid.create({
        data: {
          listingId,
          bidderId: user.id,
          amount,
        },
      });

      const updatedListing = await tx.listing.findUnique({
        where: {
          id: listingId,
        },
        include: dbListingInclude,
      });

      if (!updatedListing) {
        throw new AuctionBidError("Не удалось обновить данные аукциона.");
      }

      return updatedListing;
    });

    revalidatePath("/");

    return {
      ok: true,
      listing: mapCreatedListingToCardModel(listing, user.id),
    };
  } catch (error) {
    if (error instanceof AuctionBidError) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Failed to place auction bid", error);
    return {
      ok: false,
      error: "Не удалось сделать ставку. Попробуйте ещё раз.",
    };
  }
}

class AuctionBidError extends Error {}
