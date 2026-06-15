"use client";

import { useRef, useState, useTransition } from "react";

import navigationPointerIcon from "@/assets/icon/navigation-pointer-01.svg";
import { sendSupportMessageAction } from "@/features/support/actions/send-support-message";
import { cn } from "@/lib/utils";
import type { SupportConversationModel } from "@/types/support";

type SupportMessageFormProps = {
  onSent?: (conversation: SupportConversationModel) => void;
};

export function SupportMessageForm({ onSent }: SupportMessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasMessage = message.trim().length > 0;

  return (
    <div className="border-t border-gf-bg-alt md:border-border">
      <form
        ref={formRef}
        className="flex gap-2 px-4 py-6 md:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");

          const form = event.currentTarget;
          const formData = new FormData(form);

          startTransition(() => {
            void (async () => {
              const result = await sendSupportMessageAction(formData);

              if (!result.ok) {
                setError(result.error);
                return;
              }

              onSent?.(result.conversation);
              form.reset();
              setMessage("");
            })();
          });
        }}
      >
        <input
          className="h-[50px] min-w-0 flex-1 rounded-2xl bg-gf-bg-alt px-4 text-gf-body-m outline-none placeholder:text-gf-text-secondary focus:ring-2 focus:ring-primary md:h-11 md:rounded-full md:bg-muted"
          name="body"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Сообщение"
          disabled={isPending}
          required
        />
        <button
          className={cn(
            "grid size-[50px] shrink-0 place-items-center rounded-full bg-gf-bg-alt transition-colors",
            hasMessage ? "text-gf-text-action" : "text-gf-text-tertiary",
          )}
          type="submit"
          aria-label="Отправить сообщение"
          disabled={isPending || !hasMessage}
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
      </form>
      {error ? <p className="px-4 pb-4 text-sm text-primary">{error}</p> : null}
    </div>
  );
}
