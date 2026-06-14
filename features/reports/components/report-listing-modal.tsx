"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createReportAction } from "@/features/reports/actions/create-report";
import { reportReasons } from "@/features/reports/constants/report-reasons";
import { trackAnalyticsEvent } from "@/lib/analytics";

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
  const [isPending, startTransition] = useTransition();

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
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 rounded-2xl border border-border bg-background px-4 outline-none ring-primary focus:ring-2"
            >
              {reportReasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
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
