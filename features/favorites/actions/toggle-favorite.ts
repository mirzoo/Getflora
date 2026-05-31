"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth/services/current-user";
import { prisma } from "@/db/prisma";

export async function toggleFavoriteAction(listingId: string) {
  const user = await getSessionUser();

  if (!user) {
    throw new Error("AUTH_REQUIRED");
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
