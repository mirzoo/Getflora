"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";
import { checkRateLimit } from "@/services/rate-limit";

type SendMessageResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

const maxMessageLength = 1000;
const messageRateLimitWindowMs = 10 * 60 * 1000;
const messageRateLimitMax = 30;

export async function sendMessageAction(formData: FormData): Promise<SendMessageResult> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !body) {
    return {
      ok: false,
      error: "Введите текст сообщения.",
    };
  }

  if (body.length > maxMessageLength) {
    return {
      ok: false,
      error: "Сообщение слишком длинное.",
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
      listingId: true,
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

  const rateLimit = await checkRateLimit({
    scope: "message-send",
    identifier: user.id,
    windowMs: messageRateLimitWindowMs,
    max: messageRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много сообщений за короткое время. Попробуйте позже.",
    };
  }

  await prisma.message.create({
    data: {
      conversationId,
      listingId: conversation.listingId,
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

  revalidatePath(`/messages/${conversation.listingId}`);
  revalidatePath("/");

  return {
    ok: true,
  };
}
