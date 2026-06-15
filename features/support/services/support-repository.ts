import { Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { requireAdmin, requireAdminAction } from "@/features/admin/services/admin-auth";
import { getSessionUser, requireCurrentUser } from "@/features/auth/services/current-user";
import type {
  SupportConversationModel,
  SupportMessageModel,
  SupportPreviewModel,
} from "@/types/support";

const supportConversationInclude = {
  user: true,
  messages: {
    include: {
      sender: true,
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

export async function getSupportPreviewForCurrentUser(): Promise<SupportPreviewModel> {
  const user = await getSessionUser();

  if (!user) {
    return {
      conversationId: null,
      lastMessage: "Хорошо",
      updatedAt: null,
    };
  }

  const conversation = await prisma.supportConversation.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return {
    conversationId: conversation?.id ?? null,
    lastMessage: conversation?.messages[0]?.body ?? "Хорошо",
    updatedAt: conversation?.updatedAt.toISOString() ?? null,
  };
}

export async function getOrCreateSupportConversationForCurrentUser(): Promise<SupportConversationModel> {
  const user = await requireCurrentUser();

  const conversation = await prisma.supportConversation.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
    },
    include: supportConversationInclude,
  });

  return mapSupportConversation(conversation, user.id);
}

export async function getAdminSupportConversations(): Promise<SupportConversationModel[]> {
  const admin = await requireAdmin();

  const conversations = await prisma.supportConversation.findMany({
    include: supportConversationInclude,
    orderBy: {
      updatedAt: "desc",
    },
  });

  return conversations.map((conversation) => mapSupportConversation(conversation, admin.id));
}

export async function getAdminSupportConversation(
  conversationId: string,
): Promise<SupportConversationModel | null> {
  const admin = await requireAdmin();

  const conversation = await prisma.supportConversation.findUnique({
    where: {
      id: conversationId,
    },
    include: supportConversationInclude,
  });

  return conversation ? mapSupportConversation(conversation, admin.id) : null;
}

export async function createSupportMessageForCurrentUser(body: string): Promise<SupportConversationModel> {
  const user = await requireCurrentUser();
  const conversation = await prisma.supportConversation.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
    },
  });

  await createSupportMessage({
    conversationId: conversation.id,
    senderId: user.id,
    body,
  });

  const updatedConversation = await prisma.supportConversation.findUniqueOrThrow({
    where: {
      id: conversation.id,
    },
    include: supportConversationInclude,
  });

  return mapSupportConversation(updatedConversation, user.id);
}

export async function createSupportMessageFromAdmin(
  conversationId: string,
  body: string,
): Promise<SupportConversationModel> {
  const admin = await requireAdminAction();
  const conversation = await prisma.supportConversation.findUnique({
    where: {
      id: conversationId,
    },
    select: {
      id: true,
    },
  });

  if (!conversation) {
    throw new Error("SUPPORT_CONVERSATION_NOT_FOUND");
  }

  await createSupportMessage({
    conversationId,
    senderId: admin.id,
    body,
  });

  const updatedConversation = await prisma.supportConversation.findUniqueOrThrow({
    where: {
      id: conversationId,
    },
    include: supportConversationInclude,
  });

  return mapSupportConversation(updatedConversation, admin.id);
}

async function createSupportMessage({
  conversationId,
  senderId,
  body,
}: {
  conversationId: string;
  senderId: string;
  body: string;
}) {
  await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        conversationId,
        senderId,
        body,
      },
    }),
    prisma.supportConversation.update({
      where: {
        id: conversationId,
      },
      data: {
        status: "OPEN",
        updatedAt: new Date(),
      },
    }),
  ]);
}

type SupportConversationWithRelations = Prisma.SupportConversationGetPayload<{
  include: typeof supportConversationInclude;
}>;

function mapSupportConversation(
  conversation: SupportConversationWithRelations,
  currentUserId: string,
): SupportConversationModel {
  const messages = conversation.messages.map<SupportMessageModel>((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId,
    senderName: message.sender.name,
    isOwn: message.senderId === currentUserId,
  }));

  return {
    id: conversation.id,
    userId: conversation.userId,
    userName: conversation.user.name,
    userEmail: conversation.user.email,
    userAvatarUrl: conversation.user.avatarUrl,
    status: conversation.status,
    lastMessage: messages[messages.length - 1]?.body ?? "Диалог создан",
    updatedAt: conversation.updatedAt.toISOString(),
    messages,
  };
}
