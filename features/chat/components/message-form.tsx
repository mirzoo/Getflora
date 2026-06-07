"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendMessageAction } from "@/features/chat/actions/send-message";

type MessageFormProps = {
  conversationId: string;
  listingId: string;
  disabled?: boolean;
};

export function MessageForm({ conversationId, listingId, disabled = false }: MessageFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="border-t border-border">
      <form
        ref={formRef}
        className="flex gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");

          const form = event.currentTarget;
          const formData = new FormData(form);

          startTransition(() => {
            void (async () => {
              const result = await sendMessageAction(formData);

              if (!result.ok) {
                setError(result.error);
                return;
              }

              form.reset();
              router.refresh();
            })();
          });
        }}
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="listingId" value={listingId} />
        <input
          className="h-11 min-w-0 flex-1 rounded-full bg-muted px-4 outline-none focus:ring-2 focus:ring-primary"
          name="body"
          placeholder="Написать сообщение"
          disabled={disabled || isPending}
          required
        />
        <Button type="submit" disabled={disabled || isPending}>
          <MessageCircle className="size-4" />
          <span className="hidden md:inline">{isPending ? "Отправляем..." : "Отправить"}</span>
        </Button>
      </form>
      {error ? <p className="px-4 pb-4 text-sm text-primary">{error}</p> : null}
    </div>
  );
}
