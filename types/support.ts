export type SupportMessageModel = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  isOwn: boolean;
};

export type SupportConversationModel = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  userAvatarUrl: string | null;
  status: "OPEN" | "CLOSED";
  lastMessage: string;
  updatedAt: string;
  messages: SupportMessageModel[];
};

export type SupportPreviewModel = {
  conversationId: string | null;
  lastMessage: string;
  updatedAt: string | null;
};
