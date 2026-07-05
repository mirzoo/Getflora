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

  // Атомарно: владелец + текущий статус проверяются в самом update,
  // чтобы параллельные вызовы не перезаписывали SOLD/EXPIRED повторно.
  const updated = await prisma.listing.updateMany({
    where: {
      id: listingId,
      sellerId: user.id,
      status: "ACTIVE",
    },
    data: {
      status,
      soldAt: status === "SOLD" ? new Date() : null,
      archivedAt: status === "EXPIRED" ? new Date() : null,
    },
  });

  if (updated.count !== 1) {
    return {
      ok: false,
      error: "Объявление не найдено, уже продано или снято с публикации.",
    };
  }

  revalidatePath("/");

  return {
    ok: true,
  };
}
