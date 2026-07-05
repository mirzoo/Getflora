"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth/services/current-user";
import { prisma } from "@/db/prisma";
import { checkRateLimit } from "@/services/rate-limit";

const favoriteRateLimitWindowMs = 10 * 60 * 1000;
const favoriteRateLimitMax = 60;

export async function toggleFavoriteAction(listingId: string) {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }

  const rateLimit = await checkRateLimit({
    scope: "favorite-toggle",
    identifier: user.id,
    windowMs: favoriteRateLimitWindowMs,
    max: favoriteRateLimitMax,
  });

  if (!rateLimit.ok) {
    throw new Error("FAVORITE_RATE_LIMITED");
  }

  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
    select: {
      sellerId: true,
      status: true,
    },
  });

  if (!listing || listing.sellerId === user.id || listing.status !== "ACTIVE") {
    throw new Error("FAVORITE_NOT_ALLOWED");
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_listingId: {
        userId: user.id,
        listingId,
      },
    },
  });

  if (favorite) {
    await prisma.favorite.delete({
      where: {
        id: favorite.id,
      },
    });

    revalidatePath("/");
    return { isFavorite: false };
  }

  await prisma.favorite.create({
    data: {
      userId: user.id,
      listingId,
    },
  });

  revalidatePath("/");
  return { isFavorite: true };
}
