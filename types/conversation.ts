export type ConversationPreviewModel = {
  id: string;
  listingId: string;
  listingTitle: string;
  participantName: string;
  participantRole: "buyer" | "seller";
  lastMessage: string;
  updatedAt: string;
};
