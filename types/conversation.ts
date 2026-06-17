export type ConversationPreviewModel = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingPrice: number;
  listingImageUrl: string | null;
  participantName: string;
  participantRole: "buyer" | "seller";
  participantAvatarUrl: string | null;
  lastMessage: string;
  recentMessages: ConversationPreviewMessageModel[];
  updatedAt: string;
};

export type ConversationPreviewMessageModel = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  isOwn: boolean;
};
