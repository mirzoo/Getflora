"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireAdminAction } from "@/features/admin/services/admin-auth";
import { getDemoConversationForReply } from "@/features/admin/services/demo-chat-repository";
import { checkRateLimit } from "@/services/rate-limit";

type SendDemoChatMessageResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

const maxMessageLength = 1000;
const messageRateLimitWindowMs = 10 * 60 * 1000;
const messageRateLimitMax = 60;

export async function sendDemoChatMessageAction(formData: FormData): Promise<SendDemoChatMessageResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !body) {
    return { ok: false, error: "Введите текст сообщения." };
  }

  if (body.length > maxMessageLength) {
    return { ok: false, error: "Сообщение слишком длинное." };
  }

  const conversation = await getDemoConversationForReply(conversationId);

  if (!conversation) {
    return { ok: false, error: "Витринный диалог не найден." };
  }

  if (!canSendMessageForConversation(conversation)) {
    return { ok: false, error: "Объявление уже недоступно для переписки." };
  }

  const rateLimit = await checkRateLimit({
    scope: "admin-demo-message-send",
    identifier: admin.id,
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
      senderId: conversation.sellerId,
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

  revalidatePath("/admin/demo-chats");
  revalidatePath(`/messages/${conversation.listingId}`);
  revalidatePath("/");

  return { ok: true };
}

function canSendMessageForConversation(conversation: NonNullable<Awaited<ReturnType<typeof getDemoConversationForReply>>>) {
  const auctionEnded = conversation.listing.type === "AUCTION" && (
    conversation.listing.status === "EXPIRED" ||
    conversation.listing.status === "SOLD" ||
    Boolean(conversation.listing.expiresAt && conversation.listing.expiresAt <= new Date())
  );

  if (conversation.listing.status === "ACTIVE" && !auctionEnded) {
    return true;
  }

  if (!auctionEnded) {
    return false;
  }

  const winnerId = conversation.listing.soldToBuyerId ?? conversation.listing.auctionBids[0]?.bidderId;

  return Boolean(winnerId);
}
