"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Info, X } from "lucide-react";

import {
  completeEmailCodeSignUpAction,
  requestEmailCodeAction,
  verifyEmailCodeAction,
} from "@/features/auth/actions/session";
import { AuthModalHero } from "@/features/auth/components/auth-modal-hero";
import { ButtonBox } from "@/components/ui/button-box";
import { GfInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthModalProps = {
  onClose: () => void;
  onAuthenticated?: (user: {
    id: string;
    name: string;
    email: string | null;
  }) => void;
};

type AuthStep = "email" | "code" | "sign-up";

const resendCooldownSeconds = 50;

export function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isPending, startTransition] = useTransition();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const maskedCode = useMemo(() => code.padEnd(6, " ").slice(0, 6).split(""), [code]);

  function handleSubmitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestEmailCodeAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();
      setSubmittedEmail(nextEmail);
      setCode("");
      setCooldown(resendCooldownSeconds);
      setStep("code");
    });
  }

  function submitCode(nextCode: string) {
    if (isPending || nextCode.length !== 6) {
      return;
    }

    setError("");
    setInfo("");

    const formData = new FormData();
    formData.set("email", submittedEmail);
    formData.set("code", nextCode);

    startTransition(async () => {
      const result = await verifyEmailCodeAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.kind === "sign-up") {
        setStep("sign-up");
        return;
      }

      onAuthenticated?.(result.user);
      onClose();
      router.refresh();
    });
  }

  function handleCompleteSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const formData = new FormData(event.currentTarget);
    formData.set("email", submittedEmail);
    formData.set("code", code);
    formData.set("termsAccepted", acceptedTerms ? "on" : "");

    startTransition(async () => {
      const result = await completeEmailCodeSignUpAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onAuthenticated?.(result.user);
      onClose();
      router.refresh();
    });
  }

  function handleSendAgain() {
    if (!submittedEmail || cooldown > 0) {
      return;
    }

    setError("");
    setInfo("");

    const formData = new FormData();
    formData.set("email", submittedEmail);

    startTransition(async () => {
      const result = await requestEmailCodeAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCode("");
      setCooldown(resendCooldownSeconds);
      setInfo("Отправили новый код.");
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

  function handlePasswordClick() {
    setError("");
    setInfo("Вход по паролю оставлен как резервный сценарий и будет вынесен отдельно.");
  }

  function handleBackToEmail() {
    setStep("email");
    setCode("");
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-[1130px] flex-col overflow-hidden rounded-t-[32px] bg-gf-bg-base md:max-h-[90vh] md:rounded-[36px] xl:min-h-[510px] xl:flex-row xl:items-stretch"
        onClick={(event) => event.stopPropagation()}
      >
        <AuthModalHero className="hidden xl:flex xl:w-[462px]" />

        <div className="flex w-full shrink-0 flex-col justify-center px-6 py-10 md:px-12 md:py-16 xl:w-[668px] xl:px-[88px] xl:py-[92px]">
          {step === "email" ? (
            <form className="flex flex-col" onSubmit={handleSubmitEmail}>
              <div className="space-y-1 pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-[28px] font-extrabold leading-none text-gf-text-primary"
                >
                  Войти или зарегистрироваться
                </h2>
                <p className="text-base leading-5 text-gf-text-secondary">
                  Введите email — отправим код. Отдельная регистрация не нужна.
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

              <StatusText error={error} info={info} />

              <ButtonBox variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Отправляем..." : "Продолжить"}
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

              <ButtonBox className="mt-2" variant="float" type="button" onClick={handlePasswordClick}>
                Войти по паролю
              </ButtonBox>
            </form>
          ) : null}

          {step === "code" ? (
            <div className="flex flex-col">
              <div className="space-y-5 pr-0 md:pr-14">
                <div className="space-y-3">
                  <h2
                    id="auth-modal-title"
                    className="text-[30px] font-extrabold leading-none text-gf-text-primary"
                  >
                    Подтвердите email
                  </h2>
                  <p className="text-base leading-5 text-gf-text-primary">
                    Мы отправили код на{" "}
                    <span className="font-medium text-gf-text-action">{submittedEmail}</span>.
                  </p>
                </div>

                <button
                  className="relative grid grid-cols-6 gap-2 text-left"
                  type="button"
                  onClick={() => codeInputRef.current?.focus()}
                  aria-label="Введите код из письма"
                >
                  {maskedCode.map((digit, index) => (
                    <span
                      key={`${index}-${digit}`}
                      className={cn(
                        "grid h-14 min-w-0 place-items-center rounded-2xl bg-gf-bg-alt text-xl font-bold text-gf-text-primary",
                        digit.trim() && "bg-gf-bg-accent-opposite text-gf-text-action",
                      )}
                    >
                      {digit.trim()}
                    </span>
                  ))}
                  <input
                    ref={codeInputRef}
                    className="sr-only"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => {
                      const nextCode = event.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(nextCode);
                      submitCode(nextCode);
                    }}
                  />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-gf-border px-4 py-3 text-gf-body-s text-gf-text-secondary">
                  <Info className="size-5 shrink-0" />
                  Если не видите письмо, проверьте папку “Спам”
                </div>
              </div>

              <StatusText className="mt-4" error={error} info={info} />

              <ButtonBox
                className="mt-4"
                variant={cooldown > 0 ? "float" : "primary"}
                type="button"
                disabled={isPending || cooldown > 0}
                onClick={handleSendAgain}
              >
                {cooldown > 0
                  ? `Получить новый код через 00:${String(cooldown).padStart(2, "0")}`
                  : "Получить новый код"}
              </ButtonBox>

              <ButtonBox className="mt-2" variant="float" type="button" onClick={handleBackToEmail}>
                Изменить почту
              </ButtonBox>
            </div>
          ) : null}

          {step === "sign-up" ? (
            <form className="flex flex-col" onSubmit={handleCompleteSignUp}>
              <div className="space-y-1 pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-[28px] font-extrabold leading-none text-gf-text-primary"
                >
                  Создадим аккаунт
                </h2>
                <p className="text-base leading-5 text-gf-text-secondary">
                  Email подтверждён. Укажите имя и примите правила сервиса.
                </p>
              </div>

              <div className="grid gap-2 pb-4 pt-8">
                <GfInput
                  id="auth-sign-up-name"
                  label="Имя"
                  name="name"
                  placeholder="Как к вам обращаться"
                  required
                  maxLength={80}
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <label className="mb-4 flex cursor-pointer items-start gap-3 text-gf-body-s text-gf-text-secondary">
                <input
                  className="mt-0.5 size-5 shrink-0 rounded-md border border-gf-border accent-gf-bg-accent"
                  type="checkbox"
                  name="termsAccepted"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />
                <span>Принимаю правила использования Getflora</span>
              </label>

              <StatusText error={error} info={info} />

              <ButtonBox type="submit" disabled={isPending || !acceptedTerms}>
                {isPending ? "Сохраняем..." : "Принять и продолжить"}
              </ButtonBox>

              <ButtonBox className="mt-2" variant="float" type="button" onClick={handleBackToEmail}>
                Изменить почту
              </ButtonBox>
            </form>
          ) : null}
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

function StatusText({
  error,
  info,
  className,
}: {
  error: string;
  info: string;
  className?: string;
}) {
  if (!error && !info) {
    return null;
  }

  return (
    <div className={cn("mb-4", className)}>
      {error ? <p className="text-gf-body-s text-gf-text-negative">{error}</p> : null}
      {info ? <p className="text-gf-body-s text-gf-text-secondary">{info}</p> : null}
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
