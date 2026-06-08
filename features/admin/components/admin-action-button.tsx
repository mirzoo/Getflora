"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminActionButtonProps = {
  label: string;
  confirmMessage?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  hiddenFields?: Record<string, string>;
  reasonField?: boolean;
  reasonPlaceholder?: string;
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  buttonClassName?: string;
  successRedirectPath?: string;
  children?: ReactNode;
};

export function AdminActionButton({
  label,
  confirmMessage,
  variant = "secondary",
  hiddenFields = {},
  reasonField = false,
  reasonPlaceholder = "Причина (необязательно)",
  action,
  buttonClassName,
  successRedirectPath,
  children,
}: AdminActionButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    Object.entries(hiddenFields).forEach(([key, value]) => {
      formData.set(key, value);
    });

    if (reasonField) {
      formData.set("reason", reason);
    }

    setError(null);

    startTransition(async () => {
      const result = await action(formData);

      if (!result.ok) {
        setError(result.error ?? "Не удалось выполнить действие.");
        return;
      }

      setReason("");
      if (successRedirectPath) {
        router.push(successRedirectPath);
        return;
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      {children}
      {reasonField ? (
        <input
          className="h-10 rounded-2xl border border-border/80 bg-white/75 px-4 text-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={reasonPlaceholder}
          maxLength={200}
        />
      ) : null}
      <Button
        type="submit"
        variant={variant}
        disabled={isPending}
        className={cn("shadow-sm", buttonClassName)}
      >
        {isPending ? "Выполняем..." : label}
      </Button>
      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
