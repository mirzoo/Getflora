"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { markListingSoldFromConversationAction } from "@/features/chat/actions/mark-sold-from-conversation";
import { trackAnalyticsEvent } from "@/lib/analytics";

type MarkSoldInChatButtonProps = {
  conversationId: string;
};

export function MarkSoldInChatButton({ conversationId }: MarkSoldInChatButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError("");
          startTransition(() => {
            void (async () => {
              const result = await markListingSoldFromConversationAction(conversationId);

              if (!result.ok) {
                setError(result.error);
                return;
              }

              trackAnalyticsEvent("listing_marked_sold", {
                conversationId,
                source: "chat",
              });
              router.refresh();
            })();
          });
        }}
      >
        {isPending ? "Сохраняем..." : "Продано — снять с публикации"}
      </Button>
      {error ? <p className="text-sm text-primary">{error}</p> : null}
    </div>
  );
}
