"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ButtonBox } from "@/components/ui/button-box";
import { GfInput } from "@/components/ui/input";
import { completeMagicLinkSignUpAction } from "@/features/auth/actions/session";

type CompleteRegistrationFormProps = {
  token: string;
  email: string;
};

export function CompleteRegistrationForm({ token, email }: CompleteRegistrationFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="mx-auto flex w-full max-w-[492px] flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        if (!acceptedTerms) {
          setError("Подтвердите согласие с правилами.");
          return;
        }

        const formData = new FormData(event.currentTarget);
        formData.set("token", token);
        formData.set("termsAccepted", "on");

        startTransition(async () => {
          const result = await completeMagicLinkSignUpAction(formData);

          if (!result.ok) {
            setError(result.error);
            return;
          }

          router.replace("/");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <h1 className="text-[28px] font-extrabold leading-none text-gf-text-primary">Почти готово</h1>
        <p className="text-base leading-5 text-gf-text-secondary">
          Email подтверждён. Укажите имя — и можно пользоваться Getflora.
        </p>
      </div>

      <div className="grid gap-2 pt-8">
        <GfInput id="email" label="Email" name="email" value={email} readOnly />
        <GfInput
          id="name"
          label="Имя"
          name="name"
          placeholder="Как к вам обращаться"
          required
          maxLength={80}
          autoFocus
        />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-gf-body-s text-gf-text-secondary">
        <input
          className="mt-0.5 size-5 shrink-0 rounded-md border border-gf-border accent-gf-bg-accent"
          type="checkbox"
          name="termsAccepted"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
        />
        <span>
          Принимаю{" "}
          <Link className="text-gf-text-primary underline underline-offset-2" href="/terms">
            условия использования
          </Link>{" "}
          и{" "}
          <Link className="text-gf-text-primary underline underline-offset-2" href="/privacy">
            политику конфиденциальности
          </Link>
        </span>
      </label>

      {error ? <p className="mt-4 text-gf-body-s text-gf-text-negative">{error}</p> : null}

      <ButtonBox className="mt-6" type="submit" disabled={isPending || !acceptedTerms}>
        {isPending ? "Сохраняем..." : "Готово"}
      </ButtonBox>
    </form>
  );
}
