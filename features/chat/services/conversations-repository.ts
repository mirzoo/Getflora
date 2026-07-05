import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { requireCurrentUser, getSessionUser } from "@/features/auth/services/current-user";
import type { ConversationPreviewModel } from "@/types/conversation";

const conversationPreviewsLimit = 50;
const conversationMessagesLimit = 200;
// Не тянем полный User (passwordHash, email и т.д.) в данные чата.
const chatParticipantSelect = {
  id: true,
  name: true,
  avatarUrl: true,
} as const;

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
          select: {
            title: true,
            price: true,
            images: {
              select: {
                url: true,
              },
              orderBy: {
                order: "asc",
              },
              take: 1,
            },
          },
        },
        buyer: {
          select: chatParticipantSelect,
        },
        seller: {
          select: chatParticipantSelect,
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          include: {
            sender: {
              select: chatParticipantSelect,
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: conversationPreviewsLimit,
    });

    return conversations.map((conversation) => {
      const currentUserIsSeller = conversation.sellerId === user.id;
      const participant = currentUserIsSeller ? conversation.buyer : conversation.seller;
      const recentMessages = conversation.messages
        .slice()
        .reverse()
        .map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.createdAt.toISOString(),
          senderId: message.senderId,
          senderName: message.sender.name,
          isOwn: message.senderId === user.id,
        }));

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
        recentMessages,
        updatedAt: conversation.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    console.warn("Failed to read conversation previews.", error);
    return [];
  }
}

export async function getOrCreateConversationForListing(
  listingId: string,
  conversationId?: string,
  buyerId?: string,
) {
  const user = await requireCurrentUser();
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
    include: {
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
  });

  if (!listing) {
    return null;
  }

  if (listing.sellerId === user.id) {
    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          listingId,
          sellerId: user.id,
        },
        include: conversationDetailsInclude,
      });

      if (conversation && isAuctionEnded(listing) && conversation.buyerId !== getAuctionWinnerId(listing)) {
        return null;
      }

      return conversation;
    }

    if (buyerId) {
      const winnerId = getAuctionWinnerId(listing);

      if (!winnerId || buyerId !== winnerId || !isAuctionEnded(listing)) {
        return null;
      }

      return getOrCreateConversation({
        listingId,
        buyerId,
        sellerId: user.id,
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

  if (isAuctionEnded(listing) && getAuctionWinnerId(listing) !== user.id) {
    return null;
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

  // Новый диалог можно открыть только по активному объявлению
  // (или победителю завершённого аукциона). BLOCKED/EXPIRED/SOLD — нельзя.
  const isAuctionWinner = isAuctionEnded(listing) && getAuctionWinnerId(listing) === user.id;

  if (listing.status !== "ACTIVE" && !isAuctionWinner) {
    return null;
  }

  return getOrCreateConversation({
    listingId,
    buyerId: user.id,
    sellerId: listing.sellerId,
  });
}

async function getOrCreateConversation({
  listingId,
  buyerId,
  sellerId,
}: {
  listingId: string;
  buyerId: string;
  sellerId: string;
}) {
  try {
    return await prisma.conversation.create({
      data: {
        listingId,
        buyerId,
        sellerId,
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
          buyerId,
          sellerId,
        },
        include: conversationDetailsInclude,
      });
    }

    throw error;
  }
}

function isAuctionEnded(listing: {
  type: string;
  status: string;
  expiresAt: Date | null;
}) {
  return listing.type === "AUCTION" && (
    listing.status === "EXPIRED" ||
    listing.status === "SOLD" ||
    Boolean(listing.expiresAt && listing.expiresAt <= new Date())
  );
}

function getAuctionWinnerId(listing: {
  soldToBuyerId: string | null;
  auctionBids: Array<{ bidderId: string }>;
}) {
  return listing.soldToBuyerId ?? listing.auctionBids[0]?.bidderId;
}

const conversationDetailsInclude = {
  listing: true,
  seller: {
    select: chatParticipantSelect,
  },
  buyer: {
    select: chatParticipantSelect,
  },
  messages: {
    include: {
      sender: {
        select: chatParticipantSelect,
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
    // Отрицательный take в Prisma возвращает последние N при сортировке asc.
    take: -conversationMessagesLimit,
  },
};
