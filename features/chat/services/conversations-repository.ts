import { Prisma } from "@prisma/client";

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
        listing: {
          include: {
            images: {
              orderBy: {
                order: "asc",
              },
              take: 1,
            },
          },
        },
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
        listingPrice: conversation.listing.price,
        listingImageUrl: conversation.listing.images[0]?.url ?? null,
        participantName: participant?.name ?? "Покупатель",
        participantRole: currentUserIsSeller ? "buyer" : "seller",
        participantAvatarUrl: participant?.avatarUrl ?? null,
        lastMessage: conversation.messages[0]?.body ?? "Диалог создан",
        updatedAt: conversation.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    console.warn("Failed to read conversation previews.", error);
    return [];
  }
}

export async function getOrCreateConversationForListing(listingId: string, conversationId?: string) {
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
    if (conversationId) {
      return prisma.conversation.findFirst({
        where: {
          id: conversationId,
          listingId,
          sellerId: user.id,
        },
        include: conversationDetailsInclude,
      });
    }

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

  try {
    return await prisma.conversation.create({
      data: {
        listingId,
        buyerId: user.id,
        sellerId: listing.sellerId,
      },
      include: conversationDetailsInclude,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.conversation.findFirstOrThrow({
        where: {
          listingId,
          buyerId: user.id,
          sellerId: listing.sellerId,
        },
        include: conversationDetailsInclude,
      });
    }

    throw error;
  }
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
