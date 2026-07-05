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
      buyerId: true,
      sellerId: true,
      listing: {
        select: {
          type: true,
          status: true,
          expiresAt: true,
          soldToBuyerId: true,
          auctionBids: {
            select: {
              bidderId: true,
            },
            orderBy: [
              {
                amount: "desc",
              },
              {
                createdAt: "asc",
              },
            ],
            take: 1,
          },
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

  if (!canSendMessageForConversation(conversation)) {
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

  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        listingId: conversation.listingId,
        senderId: user.id,
        body,
      },
    }),
    prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/messages/${conversation.listingId}`);
  revalidatePath("/");

  return {
    ok: true,
  };
}

function canSendMessageForConversation(conversation: {
  buyerId: string | null;
  sellerId: string;
  listing: {
    type: string;
    status: string;
    expiresAt: Date | null;
    soldToBuyerId: string | null;
    auctionBids: Array<{ bidderId: string }>;
  };
}) {
  const auctionEnded = conversation.listing.type === "AUCTION" && (
    conversation.listing.status === "EXPIRED" ||
    conversation.listing.status === "SOLD" ||
    Boolean(conversation.listing.expiresAt && conversation.listing.expiresAt <= new Date())
  );

  if (conversation.listing.status === "ACTIVE" && !auctionEnded) {
    return true;
  }

  if (!auctionEnded || !conversation.buyerId) {
    return false;
  }

  const winnerId = conversation.listing.soldToBuyerId ?? conversation.listing.auctionBids[0]?.bidderId;

  return conversation.buyerId === winnerId;
}
