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
  updatedAt: string;
};
