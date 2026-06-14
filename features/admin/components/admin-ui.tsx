import Link from "next/link";
import type { ReactNode } from "react";

import {
  archiveListingAdminAction,
  blockListingAction,
  deleteListingAdminAction,
  unblockListingAction,
} from "@/features/admin/actions/moderate-listing";
import { banUserAction, unbanUserAction } from "@/features/admin/actions/moderate-user";
import {
  dismissReportAction,
  markReportReviewedAction,
} from "@/features/admin/actions/review-report";
import { AdminActionButton } from "@/features/admin/components/admin-action-button";

export function AdminPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl border border-[#e4ded8] bg-[#fffaf7] p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-bold tracking-tight text-[#241713] sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {meta ? <p className="mt-2 text-sm font-medium text-muted-foreground">{meta}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-white/45 px-5 py-10 text-center">
      <p className="font-semibold text-[#241713]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function AdminInfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/55 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-[#241713]">{value}</p>
    </div>
  );
}

type ListingAdminActionsProps = {
  listingId: string;
  status: string;
};

export function ListingAdminActions({ listingId, status }: ListingAdminActionsProps) {
  return (
    <div className="grid gap-3">
      {status !== "BLOCKED" ? (
        <AdminActionButton
          label="Заблокировать"
          confirmMessage="Заблокировать объявление?"
          reasonField
          hiddenFields={{ listingId }}
          action={blockListingAction}
          buttonClassName="bg-[#241713] hover:bg-[#241713]/90"
        />
      ) : (
        <AdminActionButton
          label="Разблокировать"
          confirmMessage="Вернуть объявление в активные?"
          hiddenFields={{ listingId }}
          action={unblockListingAction}
          buttonClassName="bg-green-700 hover:bg-green-800"
        />
      )}

      {status !== "EXPIRED" && status !== "SOLD" ? (
        <AdminActionButton
          label="Снять"
          confirmMessage="Снять объявление с публикации?"
          hiddenFields={{ listingId }}
          action={archiveListingAdminAction}
          variant="outline"
        />
      ) : null}

      <AdminActionButton
        label="Удалить навсегда"
        confirmMessage="Удалить объявление без возможности восстановления?"
        variant="default"
        hiddenFields={{ listingId }}
        action={deleteListingAdminAction}
        buttonClassName="bg-red-600 hover:bg-red-700"
        successRedirectPath="/admin/listings"
      />
    </div>
  );
}

type UserAdminActionsProps = {
  userId: string;
  isBanned: boolean;
};

export function UserAdminActions({ userId, isBanned }: UserAdminActionsProps) {
  if (isBanned) {
    return (
      <AdminActionButton
        label="Разблокировать пользователя"
        confirmMessage="Разблокировать пользователя?"
        hiddenFields={{ userId }}
        action={unbanUserAction}
      buttonClassName="bg-green-700 hover:bg-green-800"
      />
    );
  }

  return (
    <AdminActionButton
      label="Заблокировать пользователя"
      confirmMessage="Заблокировать пользователя и его активные объявления?"
      reasonField
      hiddenFields={{ userId }}
      action={banUserAction}
      buttonClassName="bg-red-600 hover:bg-red-700"
    />
  );
}

type ReportAdminActionsProps = {
  reportId: string;
  status: string;
  listingId?: string;
};

export function ReportAdminActions({ reportId, status, listingId }: ReportAdminActionsProps) {
  if (status !== "OPEN") {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        Жалоба уже обработана.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {listingId ? (
        <Link
          href={`/admin/listings/${listingId}`}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-white px-5 text-sm font-medium transition hover:bg-muted"
        >
          Открыть объявление
        </Link>
      ) : null}
      <AdminActionButton
        label="Отметить рассмотренной"
        hiddenFields={{ reportId }}
        action={markReportReviewedAction}
        buttonClassName="bg-[#241713] hover:bg-[#241713]/90"
      />
      <AdminActionButton
        label="Отклонить"
        confirmMessage="Отклонить жалобу?"
        hiddenFields={{ reportId }}
        action={dismissReportAction}
        variant="outline"
      />
    </div>
  );
}

function formatAdminActionLabel(action: string) {
  const labels: Record<string, string> = {
    LISTING_BLOCKED: "Объявление заблокировано",
    LISTING_UNBLOCKED: "Объявление разблокировано",
    LISTING_ARCHIVED: "Объявление снято",
    LISTING_DELETED: "Объявление удалено",
    USER_BANNED: "Пользователь заблокирован",
    USER_UNBANNED: "Пользователь разблокирован",
    REPORT_REVIEWED: "Жалоба рассмотрена",
    REPORT_DISMISSED: "Жалоба отклонена",
  };

  return labels[action] ?? action;
}

export function AdminActionLogItem({
  action,
  targetType,
  targetId,
  createdAt,
  adminName,
}: {
  action: string;
  targetType: string;
  targetId: string;
  createdAt: Date;
  adminName: string;
}) {
  return (
    <li className="rounded-2xl border border-border/60 bg-white/55 px-4 py-3 text-sm transition hover:bg-white">
      <p className="font-semibold text-[#241713]">{formatAdminActionLabel(action)}</p>
      <p className="mt-1 text-muted-foreground">
        {adminName} · {targetType}/{targetId.slice(0, 8)} ·{" "}
        {createdAt.toLocaleString("ru-RU")}
      </p>
    </li>
  );
}

export function AdminPagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return null;
  }

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    params.set("page", String(nextPage));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
      <p className="text-sm text-muted-foreground">
        Страница {page} из {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(page - 1)} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition hover:bg-muted">
            Назад
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link href={buildHref(page + 1)} className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition hover:bg-muted">
            Дальше
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function AdminStatusBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "danger" | "success" | "warning" }) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-green-200 bg-green-50 text-green-700"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-border bg-white/70 text-foreground";

  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}>{label}</span>;
}
