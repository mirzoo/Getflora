import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";

export async function getFavoriteListingIds() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return [];
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: user.id,
      },
      select: {
        listingId: true,
      },
    });

    return favorites.map((favorite) => favorite.listingId);
  } catch (error) {
    console.warn("Failed to read favorite listings.", error);
    return [];
  }
}
