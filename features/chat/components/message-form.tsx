"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import navigationPointerIcon from "@/assets/icon/navigation-pointer-01.svg";
import { sendMessageAction } from "@/features/chat/actions/send-message";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type MessageFormProps = {
  conversationId: string;
  listingId: string;
  disabled?: boolean;
};

export function MessageForm({ conversationId, listingId, disabled = false }: MessageFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasMessage = message.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-10 border-t border-gf-bg-alt bg-gf-bg-base pb-[max(env(safe-area-inset-bottom),12px)] md:static md:border-border md:bg-transparent md:pb-0">
      <form
        ref={formRef}
        className="flex gap-2 px-4 pb-3 pt-4 md:p-4"
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

              trackAnalyticsEvent("message_sent", {
                conversationId,
                listingId,
              });
              form.reset();
              setMessage("");
              router.refresh();
            })();
          });
        }}
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input type="hidden" name="listingId" value={listingId} />
        <input
          className="h-[50px] min-w-0 flex-1 rounded-2xl bg-gf-bg-alt px-4 text-gf-body-m outline-none placeholder:text-gf-text-secondary focus:ring-2 focus:ring-primary md:h-11 md:rounded-full md:bg-muted"
          name="body"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Сообщение"
          maxLength={1000}
          disabled={disabled || isPending}
          required
        />
        <button
          className={cn(
            "grid size-[50px] shrink-0 place-items-center rounded-full bg-gf-bg-alt transition-colors md:hidden",
            hasMessage ? "text-gf-text-action" : "text-gf-text-tertiary",
          )}
          type="submit"
          aria-label="Отправить сообщение"
          disabled={disabled || isPending || !hasMessage}
        >
          <span
            className="size-6 bg-current"
            style={{
              maskImage: `url(${navigationPointerIcon.src})`,
              maskPosition: "center",
              maskRepeat: "no-repeat",
              maskSize: "24px 24px",
              WebkitMaskImage: `url(${navigationPointerIcon.src})`,
              WebkitMaskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "24px 24px",
            }}
            aria-hidden="true"
          />
        </button>
        <Button className="hidden size-11 rounded-full p-0 md:grid" type="submit" aria-label="Отправить сообщение" disabled={disabled || isPending || !hasMessage}>
          <span
            className="size-5 bg-current"
            style={{
              maskImage: `url(${navigationPointerIcon.src})`,
              maskPosition: "center",
              maskRepeat: "no-repeat",
              maskSize: "20px 20px",
              WebkitMaskImage: `url(${navigationPointerIcon.src})`,
              WebkitMaskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
              WebkitMaskSize: "20px 20px",
            }}
            aria-hidden="true"
          />
        </Button>
      </form>
      {error ? <p className="px-4 pb-4 text-sm text-primary">{error}</p> : null}
    </div>
  );
}
