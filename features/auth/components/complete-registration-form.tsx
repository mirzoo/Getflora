"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { completeMagicLinkSignUpAction } from "@/features/auth/actions/session";

type CompleteRegistrationFormProps = {
  token: string;
  email: string;
};

export function CompleteRegistrationForm({ token, email }: CompleteRegistrationFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="w-full max-w-md rounded-[28px] bg-background p-6 shadow-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);
        formData.set("token", token);

        startTransition(async () => {
          const result = await completeMagicLinkSignUpAction(formData);

          if (!result.ok) {
            setError(result.error);
            return;
          }

          router.replace("/?account=1");
          router.refresh();
        });
      }}
    >
      <h1 className="text-2xl font-bold">Завершите регистрацию</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Email подтвержден. Укажите имя, которое увидят другие пользователи Getflora.
      </p>

      <div className="mt-5 grid gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="h-11 w-full rounded-xl bg-muted px-3 text-muted-foreground outline-none"
            value={email}
            readOnly
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="name">
            Имя
          </label>
          <input
            id="name"
            className="h-11 w-full rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="name"
            placeholder="Как к вам обращаться"
            required
            maxLength={80}
            autoFocus
          />
        </div>
        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохраняем..." : "Продолжить"}
        </Button>
        <Button variant="ghost" type="button" asChild>
          <Link href="/?auth=1">Запросить новую ссылку</Link>
        </Button>
      </div>
    </form>
  );
}
