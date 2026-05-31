"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { getSessionUser } from "@/features/auth/services/current-user";

export async function sendMessageAction(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const listingId = String(formData.get("listingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !listingId || !body) {
    return;
  }

  const user = await getSessionUser();

  if (!user) {
    return;
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
    },
  });

  if (!conversation) {
    return;
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
  revalidatePath("/");
}
