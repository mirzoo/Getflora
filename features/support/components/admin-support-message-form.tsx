"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { sendAdminSupportMessageAction } from "@/features/support/actions/send-support-message";

type AdminSupportMessageFormProps = {
  conversationId: string;
};

export function AdminSupportMessageForm({ conversationId }: AdminSupportMessageFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasMessage = message.trim().length > 0;

  return (
    <div className="border-t border-gf-border bg-gf-bg-base p-4">
      <form
        ref={formRef}
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");

          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set("conversationId", conversationId);

          startTransition(() => {
            void (async () => {
              const result = await sendAdminSupportMessageAction(formData);

              if (!result.ok) {
                setError(result.error);
                return;
              }

              form.reset();
              setMessage("");
              router.refresh();
            })();
          });
        }}
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <input
          className="h-11 min-w-0 flex-1 rounded-full bg-gf-bg-alt px-4 text-sm outline-none placeholder:text-gf-text-secondary focus:ring-2 focus:ring-primary"
          name="body"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ответить клиенту"
          maxLength={1000}
          disabled={isPending}
          required
        />
        <button
          className="inline-flex h-11 shrink-0 items-center rounded-full bg-gf-text-primary px-5 text-sm font-semibold text-gf-bg-base transition hover:bg-gf-neutral-dark-3 disabled:pointer-events-none disabled:opacity-60"
          type="submit"
          disabled={isPending || !hasMessage}
        >
          {isPending ? "Отправляем..." : "Отправить"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-primary">{error}</p> : null}
    </div>
  );
}
