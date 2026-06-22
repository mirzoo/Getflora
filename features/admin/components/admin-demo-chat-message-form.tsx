"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { sendDemoChatMessageAction } from "@/features/admin/actions/send-demo-chat-message";

type AdminDemoChatMessageFormProps = {
  conversationId: string;
};

export function AdminDemoChatMessageForm({ conversationId }: AdminDemoChatMessageFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const hasMessage = message.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    formData.set("conversationId", conversationId);

    startTransition(async () => {
      const result = await sendDemoChatMessageAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      form.reset();
      setMessage("");
      router.refresh();
    });
  }

  return (
    <div className="border-t border-gf-border bg-gf-bg-base p-4">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input type="hidden" name="conversationId" value={conversationId} />
        <input
          className="h-11 min-w-0 flex-1 rounded-full bg-gf-bg-alt px-4 text-sm outline-none placeholder:text-gf-text-secondary focus:ring-2 focus:ring-primary"
          name="body"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ответить от имени витринного продавца"
          disabled={isPending}
          maxLength={1000}
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
