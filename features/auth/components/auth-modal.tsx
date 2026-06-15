"use client";

import Image from "next/image";
import type { ImageProps } from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Info, X } from "lucide-react";

import googleIcon from "@/assets/icon/google-ic.svg";
import yandexIcon from "@/assets/icon/yandex-ic.svg";
import {
  completeEmailCodeSignUpAction,
  requestEmailCodeAction,
  signInAction,
  verifyEmailCodeAction,
} from "@/features/auth/actions/session";
import { AuthModalHero } from "@/features/auth/components/auth-modal-hero";
import { ButtonBox } from "@/components/ui/button-box";
import { GfInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CurrentUserModel } from "@/features/auth/services/current-user";

type AuthModalProps = {
  onClose: () => void;
  initialStep?: AuthStep;
  initialEmail?: string;
  onAuthenticated?: (user: CurrentUserModel) => void;
};

type AuthStep = "email" | "code" | "password" | "sign-up";
type ToastVariant = "negative" | "positive" | "warning" | "info" | "neutral";

type AuthToastState = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const resendCooldownSeconds = 50;
const toastDurationMs = 3000;
const toastExitDurationMs = 200;
const minimumPasswordLength = 8;

export function AuthModal({
  onClose,
  initialStep = "email",
  initialEmail = "",
  onAuthenticated,
}: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [submittedEmail, setSubmittedEmail] = useState(
    initialStep === "code" || initialStep === "sign-up" ? initialEmail : "",
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [toast, setToast] = useState<AuthToastState | null>(null);
  const [isPending, startTransition] = useTransition();
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const avatarInitial = (submittedEmail.trim().charAt(0) || "?").toUpperCase();

  const closeToast = useCallback((toastId: number) => {
    setToast((current) => (current?.id === toastId ? null : current));
  }, []);

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
      codeInputRefs.current[0]?.focus();
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const maskedCode = useMemo(() => code.padEnd(6, " ").slice(0, 6).split(""), [code]);

  function showToast(message: string, variant: ToastVariant = "negative") {
    setToast({
      id: Date.now(),
      message,
      variant,
    });
  }

  function handleInvalidField(
    event: React.InvalidEvent<HTMLInputElement>,
    label: string,
  ) {
    event.preventDefault();
    showToast(`Введите ${label}`);
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await requestEmailCodeAction(formData);

      if (!result.ok) {
        showToast(result.error);
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
        showToast(result.error);
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

  function updateCodeDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextDigits = code.padEnd(6, " ").slice(0, 6).split("");
    nextDigits[index] = digit || " ";

    const nextCode = nextDigits.join("").replace(/\s+$/g, "");
    setCode(nextCode);
    submitCode(nextCode);

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
      codeInputRefs.current[index + 1]?.select();
    }
  }

  function handleCodeKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Backspace") {
      return;
    }

    if (maskedCode[index].trim()) {
      return;
    }

    if (index > 0) {
      event.preventDefault();
      codeInputRefs.current[index - 1]?.focus();
      codeInputRefs.current[index - 1]?.select();
    }
  }

  function handleCodePaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6 - index);

    if (!pastedDigits) {
      return;
    }

    event.preventDefault();

    const nextDigits = code.padEnd(6, " ").slice(0, 6).split("");

    pastedDigits.split("").forEach((digit, offset) => {
      nextDigits[index + offset] = digit;
    });

    const nextCode = nextDigits.join("").replace(/\s+$/g, "");
    setCode(nextCode);
    submitCode(nextCode);

    const nextFocusIndex = Math.min(index + pastedDigits.length, 5);
    codeInputRefs.current[nextFocusIndex]?.focus();
    codeInputRefs.current[nextFocusIndex]?.select();
  }

  function handleCompleteSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!password) {
      showToast("Придумайте пароль.");
      return;
    }

    if (password.length < minimumPasswordLength) {
      showToast(`Пароль слишком короткий. Минимум ${minimumPasswordLength} символов.`);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("email", submittedEmail);
    formData.set("code", code);
    formData.set("termsAccepted", acceptedTerms ? "on" : "");

    startTransition(async () => {
      const result = await completeEmailCodeSignUpAction(formData);

      if (!result.ok) {
        showToast(result.error);
        return;
      }

      onAuthenticated?.(result.user);
      onClose();
      router.refresh();
    });
  }

  function handleSubmitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInfo("");

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await signInAction(formData);

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
        showToast(result.error);
        return;
      }

      setCode("");
      setCooldown(resendCooldownSeconds);
      setInfo("Отправили новый код.");
    });
  }

  function handlePasswordClick() {
    setStep("password");
    setPassword("");
    setError("");
    setInfo("");
  }

  function handleCodeClick() {
    setStep("email");
    setPassword("");
    setError("");
    setInfo("");
  }

  function handleBackToEmail() {
    setStep("email");
    setCode("");
    setPassword("");
    setError("");
    setInfo("");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-gf-bg-base p-0 md:items-center md:bg-black/60 md:p-8 md:backdrop-blur-[8px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <AuthToast toast={toast} onClose={closeToast} />

      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />

      <div
        className="relative z-10 flex h-full w-full max-w-[1130px] flex-col overflow-y-auto bg-gf-bg-base md:h-auto md:max-h-[90vh] md:overflow-hidden md:rounded-[44px] lg:min-h-[510px] lg:flex-row lg:items-stretch"
        onClick={(event) => event.stopPropagation()}
      >
        <AuthModalHero
          className="flex h-[302px] w-full shrink-0 p-2 lg:h-auto lg:w-[41%] lg:max-w-[462px] xl:w-[462px]"
        />

        <div className="flex w-full shrink-0 flex-col justify-start px-4 pb-4 pt-6 lg:min-w-0 lg:flex-1 lg:shrink lg:justify-center lg:px-12 lg:py-12 xl:w-[668px]">
          {step === "email" ? (
            <form className="flex flex-col" onSubmit={handleSubmitEmail}>
              <div className="space-y-1 pr-0 md:space-y-2 md:pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary"
                >
                  Войти или зарегистрироваться
                </h2>
                <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
                  Введите email — отправим код для входа. Отдельная регистрация не нужна
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
                  onInvalid={(event) => handleInvalidField(event, "Email")}
                />
              </div>

              <StatusText error={error} info={info} />

              <ButtonBox variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Отправляем..." : "Продолжить"}
              </ButtonBox>

              <SocialAuthOptions />

              <ButtonBox className="mt-2" variant="float" type="button" onClick={handlePasswordClick}>
                Войти по паролю
              </ButtonBox>
            </form>
          ) : null}

          {step === "password" ? (
            <form className="flex flex-col" onSubmit={handleSubmitPassword}>
              <div className="space-y-1 pr-0 md:space-y-2 md:pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary"
                >
                  Войти по паролю
                </h2>
                <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
                  Введите email и пароль от аккаунта
                </p>
              </div>

              <div className="grid gap-2 pb-4 pt-8">
                <GfInput
                  id="auth-password-email"
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onInvalid={(event) => handleInvalidField(event, "Email")}
                />
                <GfInput
                  id="auth-password-password"
                  label="Пароль"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onInvalid={(event) => handleInvalidField(event, "пароль")}
                />
              </div>

              <StatusText error={error} info={info} />

              <ButtonBox variant="primary" type="submit" disabled={isPending}>
                {isPending ? "Входим..." : "Продолжить"}
              </ButtonBox>

              <SocialAuthOptions />

              <ButtonBox className="mt-2" variant="float" type="button" onClick={handleCodeClick}>
                Войти по коду
              </ButtonBox>
            </form>
          ) : null}

          {step === "code" ? (
            <div className="flex flex-col">
              <div className="space-y-5 pr-0 md:pr-14">
                <div className="space-y-3">
                  <h2
                    id="auth-modal-title"
                    className="text-gf-h5 font-extrabold leading-[normal] text-gf-text-primary"
                  >
                    Введите код из письма
                  </h2>
                  <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
                    Отправили код на{" "}
                    <span className="font-normal text-gf-text-action">{submittedEmail}.</span>
                  </p>
                </div>

                <div
                  className="grid grid-cols-6 gap-2"
                  aria-label="Введите код из письма"
                  role="group"
                >
                  {maskedCode.map((digit, index) => (
                    <input
                      key={`${index}-${digit}`}
                      ref={(element) => {
                        codeInputRefs.current[index] = element;
                      }}
                      aria-label={`Цифра кода ${index + 1}`}
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      className={cn(
                        "h-12 w-full shrink-0 rounded-xl bg-gf-bg-alt text-center text-gf-body-m font-normal leading-[normal] text-gf-text-primary caret-gf-text-primary outline-none transition-colors hover:bg-[#f2f2f2] focus:bg-[#f2f2f2]",
                      )}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit.trim()}
                      onChange={(event) => updateCodeDigit(index, event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      onKeyDown={(event) => handleCodeKeyDown(index, event)}
                      onPaste={(event) => handleCodePaste(index, event)}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-gf-border p-4 text-gf-body-m leading-[normal] text-gf-text-secondary">
                  <Info className="size-6 shrink-0" />
                  Не получили письмо? Проверьте папку «Спам»
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
                Указать другой email
              </ButtonBox>
            </div>
          ) : null}

          {step === "sign-up" ? (
            <form className="flex flex-col" onSubmit={handleCompleteSignUp}>
              <div className="space-y-1 pr-0 md:pr-14">
                <h2
                  id="auth-modal-title"
                  className="text-[28px] font-extrabold leading-[normal] text-gf-text-primary"
                >
                  Как вас зовут?
                </h2>
                <p className="text-base leading-[normal] text-gf-text-secondary">
                  Это имя будут видеть другие пользователи
                </p>
              </div>

              <label className="mb-5 mt-6 hidden w-fit cursor-pointer md:block">
                <input className="sr-only" type="file" accept="image/*" onChange={handleAvatarChange} />
                <span
                  className="relative grid size-[100px] place-items-center overflow-visible rounded-full bg-gf-bg-alt bg-cover bg-center text-gf-h4 font-extrabold leading-[normal] text-gf-text-primary"
                  style={avatarPreviewUrl ? { backgroundImage: `url(${avatarPreviewUrl})` } : undefined}
                >
                  {avatarPreviewUrl ? null : avatarInitial}
                  <span className="absolute bottom-0 right-0 grid size-10 place-items-center rounded-full bg-white text-gf-text-primary">
                    <Camera01Icon className="size-6" />
                  </span>
                </span>
              </label>

              <div className="grid gap-2 pb-4 pt-8 md:pt-0">
                <GfInput
                  id="auth-sign-up-email"
                  label="Почта"
                  name="email-display"
                  value={submittedEmail}
                  readOnly
                  className="text-gf-text-secondary"
                />
                <GfInput
                  id="auth-sign-up-name"
                  label="Имя"
                  name="name"
                  required
                  maxLength={80}
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onInvalid={(event) => handleInvalidField(event, "имя")}
                />
                <GfInput
                  id="auth-sign-up-password"
                  label="Пароль"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onInvalid={(event) => handleInvalidField(event, "пароль")}
                />
              </div>

              <label className="mb-6 flex cursor-pointer items-start gap-2 text-gf-body-xs font-normal leading-[normal] text-gf-text-secondary md:mb-4 md:gap-3 md:text-gf-body-s">
                <input
                  className="sr-only"
                  type="checkbox"
                  name="termsAccepted"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border border-gf-border transition-colors",
                    acceptedTerms ? "border-gf-bg-accent bg-gf-bg-accent text-white" : "bg-transparent",
                  )}
                  aria-hidden="true"
                >
                  {acceptedTerms ? <CheckIcon className="size-4" /> : null}
                </span>
                <span>
                  Я соглашаюсь с{" "}
                  <Link className="text-gf-text-primary underline underline-offset-2" href="/terms">
                    условиями использования
                  </Link>
                  ,{" "}
                  <Link className="text-gf-text-primary underline underline-offset-2" href="/offer">
                    офертой
                  </Link>{" "}
                  и{" "}
                  <Link className="text-gf-text-primary underline underline-offset-2" href="/privacy">
                    политикой конфиденциальности
                  </Link>
                </span>
              </label>

              <ButtonBox type="submit" disabled={isPending || !acceptedTerms}>
                {isPending ? "Сохраняем..." : "Готово"}
              </ButtonBox>
            </form>
          ) : null}
        </div>

        <button
          className="absolute right-4 top-4 z-30 grid size-12 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2] md:right-6 md:top-6"
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

function AuthToast({
  toast,
  onClose,
}: {
  toast: AuthToastState | null;
  onClose: (toastId: number) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setIsVisible(false);
      return;
    }

    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, toastDurationMs);
    const closeTimer = window.setTimeout(() => {
      onClose(toast.id);
    }, toastDurationMs + toastExitDurationMs);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      window.clearTimeout(closeTimer);
    };
  }, [onClose, toast]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed left-1/2 top-8 z-[90] flex min-h-12 -translate-x-1/2 items-center gap-2.5 rounded-full bg-gf-bg-base py-3 pl-4 pr-[18px] shadow-[0_4px_16px_rgb(0_0_0/0.16)] transition-all duration-200 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
      )}
      role="status"
      aria-live="polite"
    >
      <ToastIcon
        variant={toast.variant}
        className={cn("size-6 shrink-0", toastColorByVariant[toast.variant])}
      />
      <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-primary">
        {toast.message}
      </p>
    </div>
  );
}

const toastColorByVariant = {
  negative: "text-gf-status-negative",
  positive: "text-gf-status-positive",
  warning: "text-gf-status-warning",
  info: "text-gf-status-info",
  neutral: "text-gf-status-neutral",
} satisfies Record<ToastVariant, string>;

function ToastIcon({
  variant,
  className,
}: {
  variant: ToastVariant;
  className?: string;
}) {
  const path =
    variant === "positive"
      ? "M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
      : "M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z";

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
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
      {error ? <p className="text-gf-body-s leading-[normal] text-gf-text-negative">{error}</p> : null}
      {info ? <p className="text-gf-body-s leading-[normal] text-gf-text-secondary">{info}</p> : null}
    </div>
  );
}

function Camera01Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 8.37722C2 8.0269 2 7.85174 2.01462 7.70421C2.1556 6.28127 3.28127 5.1556 4.70421 5.01462C4.85174 5 5.03636 5 5.40558 5C5.54785 5 5.61899 5 5.67939 4.99634C6.45061 4.94963 7.12595 4.46288 7.41414 3.746C7.43671 3.68986 7.45781 3.62657 7.5 3.5C7.54219 3.37343 7.56329 3.31014 7.58586 3.254C7.87405 2.53712 8.54939 2.05037 9.32061 2.00366C9.38101 2 9.44772 2 9.58114 2H14.4189C14.5523 2 14.619 2 14.6794 2.00366C15.4506 2.05037 16.126 2.53712 16.4141 3.254C16.4367 3.31014 16.4578 3.37343 16.5 3.5C16.5422 3.62657 16.5633 3.68986 16.5859 3.746C16.874 4.46288 17.5494 4.94963 18.3206 4.99634C18.381 5 18.4521 5 18.5944 5C18.9636 5 19.1483 5 19.2958 5.01462C20.7187 5.1556 21.8444 6.28127 21.9854 7.70421C22 7.85174 22 8.0269 22 8.37722V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V8.37722Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 16.5C14.2091 16.5 16 14.7091 16 12.5C16 10.2909 14.2091 8.5 12 8.5C9.79086 8.5 8 10.2909 8 12.5C8 14.7091 9.79086 16.5 12 16.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialAuthOptions() {
  return (
    <>
      <div className="flex items-center justify-center gap-4 py-4 text-base leading-[normal] text-gf-text-secondary">
        <span className="h-px flex-1 bg-gf-border" />
        <span>или войти через</span>
        <span className="h-px flex-1 bg-gf-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SocialAuthButton
          label="Яндекс"
          iconSrc={yandexIcon}
          href="/auth/oauth/yandex"
        />
        <SocialAuthButton
          label="Google"
          iconSrc={googleIcon}
          href="/auth/oauth/google"
        />
      </div>
    </>
  );
}

function SocialAuthButton({
  label,
  iconSrc,
  href,
}: {
  label: string;
  iconSrc: ImageProps["src"];
  href: string;
}) {
  return (
    <ButtonBox variant="float" asChild aria-label={`Войти через ${label}`}>
      <Link href={href}>
        <Image src={iconSrc} alt="" width={24} height={24} className="size-6 object-contain" />
      </Link>
    </ButtonBox>
  );
}
