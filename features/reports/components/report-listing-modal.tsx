"use client";

import Image from "next/image";
import { useId, useState, useTransition } from "react";
import { X } from "lucide-react";

import chevronDownIcon from "@/assets/icon/icn_m_chevron-down.svg";
import { Button } from "@/components/ui/button";
import { createReportAction } from "@/features/reports/actions/create-report";
import { reportReasons } from "@/features/reports/constants/report-reasons";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type ReportListingModalProps = {
  listingId: string;
  listingTitle: string;
  onClose: () => void;
  onRequireAuth: () => void;
  isAuthenticated: boolean;
};

export function ReportListingModal({
  listingId,
  listingTitle,
  onClose,
  onRequireAuth,
  isAuthenticated,
}: ReportListingModalProps) {
  const [reason, setReason] = useState<string>(reportReasons[0]?.value ?? "other");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReasonPickerOpen, setIsReasonPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const reasonListboxId = useId();
  const selectedReasonLabel =
    reportReasons.find((item) => item.value === reason)?.label ?? reportReasons[0]?.label ?? "Выберите причину";

  if (!isAuthenticated) {
    return (
      <ModalShell title="Пожаловаться" onClose={onClose}>
        <p className="text-sm text-muted-foreground">
          Войдите в аккаунт, чтобы отправить жалобу на «{listingTitle}».
        </p>
        <Button type="button" onClick={onRequireAuth}>
          Войти
        </Button>
      </ModalShell>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.set("listingId", listingId);
    formData.set("reason", reason);
    formData.set("details", details);

    startTransition(async () => {
      const result = await createReportAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      trackAnalyticsEvent("report_created", {
        listingId,
        reason,
      });
      setMessage(result.message);
    });
  }

  return (
    <ModalShell title="Пожаловаться" onClose={onClose}>
      {message ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
          <Button type="button" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Жалоба на объявление «{listingTitle}». Мы рассмотрим её вручную.
          </p>

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Причина</span>
            <span className="relative">
              <button
                className="flex h-12 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 text-left text-gf-body-m font-normal leading-[normal] text-gf-text-primary outline-none ring-primary transition-colors focus:ring-2"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isReasonPickerOpen}
                aria-controls={reasonListboxId}
                onClick={() => setIsReasonPickerOpen((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsReasonPickerOpen(false);
                  }
                }}
              >
                <span>{selectedReasonLabel}</span>
                <Image
                  src={chevronDownIcon}
                  alt=""
                  width={20}
                  height={20}
                  className={cn(
                    "size-5 shrink-0 transition-transform",
                    isReasonPickerOpen && "rotate-180",
                  )}
                />
              </button>

              {isReasonPickerOpen ? (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-[80] overflow-hidden rounded-2xl border border-border bg-background shadow-[0_8px_32px_rgb(0_0_0/0.18)]"
                  id={reasonListboxId}
                  role="listbox"
                >
                  {reportReasons.map((item) => (
                    <button
                      key={item.value}
                      className={cn(
                        "flex min-h-11 w-full items-center px-4 py-3 text-left text-gf-body-m font-normal leading-[normal] text-gf-text-primary transition-colors hover:bg-gf-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gf-bg-accent",
                        item.value === reason && "font-medium text-gf-text-action",
                      )}
                      type="button"
                      role="option"
                      aria-selected={item.value === reason}
                      onClick={() => {
                        setReason(item.value);
                        setIsReasonPickerOpen(false);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </span>
          </label>

          <label className="grid gap-2 text-sm">
            <span className="font-medium">Комментарий</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="min-h-28 rounded-2xl border border-border bg-background px-4 py-3 outline-none ring-primary focus:ring-2"
              placeholder="Необязательно"
              maxLength={500}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Отправляем..." : "Отправить жалобу"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      )}
    </ModalShell>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-end bg-black/30 p-0 md:place-items-center md:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-lg rounded-t-[28px] bg-background p-5 shadow-2xl md:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
