import { prisma } from "@/db/prisma";
import { requireCurrentUser, getSessionUser } from "@/features/auth/services/current-user";
import type { ConversationPreviewModel } from "@/types/conversation";

export async function getConversationPreviews(): Promise<ConversationPreviewModel[]> {
  try {
    const user = await getSessionUser();

    if (!user) {
      return [];
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { buyerId: user.id },
          { sellerId: user.id },
        ],
      },
      include: {
        listing: true,
        buyer: true,
        seller: true,
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return conversations.map((conversation) => {
      const currentUserIsSeller = conversation.sellerId === user.id;
      const participant = currentUserIsSeller ? conversation.buyer : conversation.seller;

      return {
        id: conversation.id,
        listingId: conversation.listingId,
        listingTitle: conversation.listing.title,
        participantName: participant?.name ?? "Покупатель",
        participantRole: currentUserIsSeller ? "buyer" : "seller",
        lastMessage: conversation.messages[0]?.body ?? "Диалог создан",
        updatedAt: conversation.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    console.warn("Failed to read conversation previews.", error);
    return [];
  }
}

export async function getOrCreateConversationForListing(listingId: string) {
  const user = await requireCurrentUser();
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
    include: {
      seller: true,
    },
  });

  if (!listing) {
    return null;
  }

  if (listing.sellerId === user.id) {
    return prisma.conversation.findFirst({
      where: {
        listingId,
        sellerId: user.id,
      },
      include: conversationDetailsInclude,
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
    },
    include: conversationDetailsInclude,
  });

  if (existingConversation) {
    return existingConversation;
  }

  return prisma.conversation.create({
    data: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      messages: {
        create: {
          listingId,
          senderId: user.id,
          body: "Здравствуйте! Букет еще доступен?",
        },
      },
    },
    include: conversationDetailsInclude,
  });
}

const conversationDetailsInclude = {
  listing: true,
  seller: true,
  buyer: true,
  messages: {
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};
