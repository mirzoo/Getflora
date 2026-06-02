"use client";

import { MessageCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { sendMessageAction } from "@/features/chat/actions/send-message";

type MessageFormProps = {
  conversationId: string;
  listingId: string;
};

export function MessageForm({ conversationId, listingId }: MessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setIsSubmitting(true);
        await sendMessageAction(formData);
        formRef.current?.reset();
        setIsSubmitting(false);
      }}
      className="flex gap-2 border-t border-border p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="listingId" value={listingId} />
      <input
        className="h-11 min-w-0 flex-1 rounded-full bg-muted px-4 outline-none focus:ring-2 focus:ring-primary"
        name="body"
        placeholder="Написать сообщение"
        disabled={isSubmitting}
        required
      />
      <Button type="submit" disabled={isSubmitting}>
        <MessageCircle className="size-4" />
        <span className="hidden lg:inline">{isSubmitting ? "Отправляем..." : "Отправить"}</span>
      </Button>
    </form>
  );
}
