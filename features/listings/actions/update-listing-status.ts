"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";

type UpdateListingStatusResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function archiveListingAction(listingId: string): Promise<UpdateListingStatusResult> {
  return updateOwnListingStatus(listingId, "EXPIRED");
}

export async function markListingSoldAction(listingId: string): Promise<UpdateListingStatusResult> {
  return updateOwnListingStatus(listingId, "SOLD");
}

async function updateOwnListingStatus(
  listingId: string,
  status: "EXPIRED" | "SOLD",
): Promise<UpdateListingStatusResult> {
  const user = await requireCurrentUser();

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      sellerId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (!listing) {
    return {
      ok: false,
      error: "Объявление не найдено или принадлежит другому пользователю.",
    };
  }

  await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: {
      status,
      soldAt: status === "SOLD" ? new Date() : null,
      archivedAt: status === "EXPIRED" ? new Date() : null,
    },
  });

  revalidatePath("/");

  return {
    ok: true,
  };
}
