import { prisma } from "@/db/prisma";
import type { ListingStatus } from "@prisma/client";

const demoSellerEmailSuffix = "@getflora.local";
const demoSellerEmailPrefix = "demo+";

export type AdminDemoConversationSummary = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: ListingStatus;
  listingImageUrl: string | null;
  buyerName: string;
  buyerEmail: string | null;
  sellerName: string;
  sellerEmail: string | null;
  lastMessage: string;
  lastSenderName: string | null;
  updatedAt: string;
};

export type AdminDemoConversationMessage = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  isSeller: boolean;
  createdAt: string;
};

export type AdminDemoConversation = Omit<
  AdminDemoConversationSummary,
  "lastMessage" | "lastSenderName"
> & {
  listingPrice: number;
  sellerId: string;
  messages: AdminDemoConversationMessage[];
};

export async function getAdminDemoConversations(): Promise<AdminDemoConversationSummary[]> {
  const conversations = await prisma.conversation.findMany({
    where: {
      seller: {
        email: {
          startsWith: demoSellerEmailPrefix,
          endsWith: demoSellerEmailSuffix,
        },
      },
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
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 80,
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listing.title,
    listingStatus: conversation.listing.status,
    listingImageUrl: conversation.listing.images[0]?.url ?? null,
    buyerName: conversation.buyer?.name ?? "Покупатель",
    buyerEmail: conversation.buyer?.email ?? null,
    sellerName: conversation.seller.name,
    sellerEmail: conversation.seller.email,
    lastMessage: conversation.messages[0]?.body ?? "Диалог создан",
    lastSenderName: conversation.messages[0]?.sender.name ?? null,
    updatedAt: conversation.updatedAt.toISOString(),
  }));
}

export async function getAdminDemoConversation(
  conversationId: string,
): Promise<AdminDemoConversation | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      seller: {
        email: {
          startsWith: demoSellerEmailPrefix,
          endsWith: demoSellerEmailSuffix,
        },
      },
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
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      messages: {
        orderBy: {
          createdAt: "asc",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    listingId: conversation.listingId,
    listingTitle: conversation.listing.title,
    listingStatus: conversation.listing.status,
    listingPrice: conversation.listing.price,
    listingImageUrl: conversation.listing.images[0]?.url ?? null,
    buyerName: conversation.buyer?.name ?? "Покупатель",
    buyerEmail: conversation.buyer?.email ?? null,
    sellerId: conversation.sellerId,
    sellerName: conversation.seller.name,
    sellerEmail: conversation.seller.email,
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      body: message.body,
      senderId: message.senderId,
      senderName: message.sender.name,
      isSeller: message.senderId === conversation.sellerId,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function getDemoConversationForReply(conversationId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      seller: {
        email: {
          startsWith: demoSellerEmailPrefix,
          endsWith: demoSellerEmailSuffix,
        },
      },
    },
    select: {
      id: true,
      listingId: true,
      sellerId: true,
      listing: {
        select: {
          status: true,
          type: true,
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
}
