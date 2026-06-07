"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { requestMagicLinkAction } from "@/features/auth/actions/session";
import { ButtonBox } from "@/components/ui/button-box";
import { GfInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthModalProps = {
  onClose: () => void;
};

type AuthStep = "email" | "sent";

export function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestMagicLinkAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();
      setSubmittedEmail(nextEmail);
      setStep("sent");
    });
  }

  function handleResend() {
    if (!submittedEmail) {
      return;
    }

    setError("");
    setInfo("");

    const formData = new FormData();
    formData.set("email", submittedEmail);

    startTransition(async () => {
      const result = await requestMagicLinkAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setInfo("Отправили ссылку ещё раз.");
    });
  }

  function handleSocialClick(provider: "yandex" | "google") {
    setError("");
    setInfo(
      provider === "yandex"
        ? "Вход через Яндекс скоро будет доступен."
        : "Вход через Google скоро будет доступен.",
    );
  }

  function handleBackToEmail() {
    setStep("email");
    setError("");
    setInfo("");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-[8px] md:items-center md:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex max-h-[92vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-t-[32px] bg-gf-bg-base md:max-h-[90vh] md:rounded-[44px] xl:min-h-[583px] xl:flex-row xl:items-stretch"
        onClick={(event) => event.stopPropagation()}
      >
        <AuthModalHero className="hidden xl:flex" />

        <div className="flex w-full shrink-0 flex-col justify-center px-6 py-10 md:px-12 md:py-16 xl:w-[668px] xl:px-[88px] xl:py-[120px]">
          {step === "email" ? (
            <form className="flex flex-col" onSubmit={handleSubmitEmail}>
              <div className="space-y-1 pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-[28px] font-extrabold leading-none text-gf-text-primary"
                >
                  Войти или начать
                </h2>
                <p className="text-base leading-5 text-gf-text-secondary">
                  Введите email – отправим ссылку. Отдельная регистрация не нужна.
                </p>
              </div>

              <div className="pb-4 pt-8">
                <GfInput
                  id="auth-email"
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              {error ? <p className="mb-4 text-gf-body-s text-gf-text-negative">{error}</p> : null}
              {info ? <p className="mb-4 text-gf-body-s text-gf-text-secondary">{info}</p> : null}

              <ButtonBox variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Отправляем..." : "Получить ссылку"}
              </ButtonBox>

              <div className="flex items-center justify-center gap-4 py-4 text-base leading-none text-gf-text-secondary">
                <span className="h-px flex-1 bg-gf-border" />
                <span>или войти через</span>
                <span className="h-px flex-1 bg-gf-border" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SocialAuthButton
                  label="Яндекс"
                  iconSrc="/auth/yandex.png"
                  onClick={() => handleSocialClick("yandex")}
                />
                <SocialAuthButton
                  label="Google"
                  iconSrc="/auth/google.png"
                  onClick={() => handleSocialClick("google")}
                />
              </div>
            </form>
          ) : (
            <div className="flex flex-col pr-14">
              <div className="space-y-1">
                <h2
                  id="auth-modal-title"
                  className="text-[28px] font-extrabold leading-none text-gf-text-primary"
                >
                  Проверьте почту
                </h2>
                <p className="text-base leading-5 text-gf-text-secondary">
                  Отправили ссылку на{" "}
                  <span className="font-medium text-gf-text-action">{submittedEmail}</span>.
                </p>
              </div>

              <p className="pt-6 text-gf-body-m text-gf-text-secondary">
                Откройте письмо и нажмите «Войти в Getflora». Ссылка действует 15 минут.
              </p>

              <div className="mt-4 rounded-2xl border border-gf-border px-4 py-3 text-gf-body-s text-gf-text-secondary">
                Если не видите письмо, проверьте папку «Спам».
              </div>

              {error ? <p className="mt-4 text-gf-body-s text-gf-text-negative">{error}</p> : null}
              {info ? <p className="mt-4 text-gf-body-s text-gf-text-secondary">{info}</p> : null}

              <ButtonBox className="mt-6" variant="primary" type="button" disabled={isPending} onClick={handleResend}>
                {isPending ? "Отправляем..." : "Отправить снова"}
              </ButtonBox>

              <ButtonBox className="mt-3" variant="float" type="button" onClick={handleBackToEmail}>
                Изменить почту
              </ButtonBox>
            </div>
          )}
        </div>

        <button
          className="absolute right-4 top-4 grid size-[50px] place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-gf-status-neutral-pale-hover md:right-6 md:top-6"
          type="button"
          aria-label="Закрыть"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function AuthModalHero({ className }: { className?: string }) {
  return (
    <div className={cn("w-[532px] shrink-0 p-2", className)}>
      <div className="relative h-full min-h-[567px] w-full overflow-hidden rounded-[40px]">
        <Image
          src="/auth/modal-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 0px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gf-bg-accent/30 to-black/30 backdrop-blur-[2px]" />
        <div className="absolute bottom-10 left-10 right-10 text-[28px] font-extrabold leading-none text-white">
          <p>Покупайте букеты</p>
          <p>до 70% дешевле</p>
        </div>
      </div>
    </div>
  );
}

function SocialAuthButton({
  label,
  iconSrc,
  onClick,
}: {
  label: string;
  iconSrc: string;
  onClick: () => void;
}) {
  return (
    <ButtonBox variant="float" type="button" aria-label={`Войти через ${label}`} onClick={onClick}>
      <Image src={iconSrc} alt="" width={32} height={32} className="size-8 object-contain" />
    </ButtonBox>
  );
}
