"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LockKeyhole } from "lucide-react";

import { ButtonBox } from "@/components/ui/button-box";
import { GfInput } from "@/components/ui/input";
import { adminPasswordSignInAction } from "@/features/auth/actions/session";

type AdminLoginFormProps = {
  nextPath: string;
};

export function AdminLoginForm({ nextPath }: AdminLoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="w-full max-w-[420px] rounded-[28px] border border-white/70 bg-[#fffaf7]/95 p-6 shadow-[0_24px_70px_rgba(36,23,19,0.12)]"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await adminPasswordSignInAction(formData);

          if (!result.ok) {
            setError("Неверный email или пароль.");
            return;
          }

          router.replace(nextPath);
          router.refresh();
        });
      }}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff1ec] text-primary">
          <LockKeyhole className="size-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Getflora Control
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#241713]">
            Вход в админку
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Только для email из списка администраторов.
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <GfInput
          id="admin-email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
        <GfInput
          id="admin-password"
          label="Пароль"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <ButtonBox className="mt-6" type="submit" disabled={isPending}>
        {isPending ? "Проверяем..." : "Войти"}
      </ButtonBox>
    </form>
  );
}
