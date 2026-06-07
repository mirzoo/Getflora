"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";

type SendMessageResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

export async function sendMessageAction(formData: FormData): Promise<SendMessageResult> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !listingId || !body) {
    return {
      ok: false,
      error: "Введите текст сообщения.",
    };
  }

  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      error: "Чтобы отправить сообщение, войдите в аккаунт.",
    };
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { buyerId: user.id },
        { sellerId: user.id },
      ],
    },
    select: {
      id: true,
      listing: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!conversation) {
    return {
      ok: false,
      error: "Диалог не найден.",
    };
  }

  if (conversation.listing.status !== "ACTIVE") {
    return {
      ok: false,
      error: "Объявление уже недоступно для переписки.",
    };
  }

  await prisma.message.create({
    data: {
      conversationId,
      listingId,
      senderId: user.id,
      body,
    },
  });

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },
    data: {
      updatedAt: new Date(),
    },
  });

  revalidatePath(`/messages/${listingId}`);

  return {
    ok: true,
  };
}
