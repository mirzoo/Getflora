"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireCurrentUser } from "@/features/auth/services/current-user";

type MarkSoldFromConversationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function markListingSoldFromConversationAction(
  conversationId: string,
): Promise<MarkSoldFromConversationResult> {
  const user = await requireCurrentUser();

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      sellerId: user.id,
    },
    select: {
      id: true,
      buyerId: true,
      listingId: true,
      listing: {
        select: {
          id: true,
          sellerId: true,
          status: true,
        },
      },
    },
  });

  if (!conversation) {
    return {
      ok: false,
      error: "Диалог не найден или доступен только продавцу.",
    };
  }

  if (conversation.listing.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Объявление уже отмечено как проданное или снято.",
    };
  }

  if (!conversation.buyerId) {
    return {
      ok: false,
      error: "В диалоге нет покупателя. Отметьте продажу из «Мои объявления».",
    };
  }

  // Статус проверяется атомарно, чтобы параллельный вызов
  // не перезаписал soldAt/soldToBuyerId уже проданного объявления.
  const updated = await prisma.listing.updateMany({
    where: {
      id: conversation.listingId,
      status: "ACTIVE",
    },
    data: {
      status: "SOLD",
      soldAt: new Date(),
      soldToBuyerId: conversation.buyerId,
    },
  });

  if (updated.count !== 1) {
    return {
      ok: false,
      error: "Объявление уже отмечено как проданное или снято.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/messages/${conversation.listingId}`);

  return {
    ok: true,
  };
}
