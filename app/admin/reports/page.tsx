import type { ReportStatus } from "@prisma/client";
import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminStatusBadge,
  ReportAdminActions,
} from "@/features/admin/components/admin-ui";
import { getAdminReports } from "@/features/admin/services/admin-repository";
import { getReportReasonLabel } from "@/features/reports/constants/report-reasons";

type AdminReportsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
  }>;
};

const statusOptions: Array<{ value: ReportStatus | ""; label: string }> = [
  { value: "OPEN", label: "Открытые" },
  { value: "REVIEWED", label: "Рассмотренные" },
  { value: "DISMISSED", label: "Отклонённые" },
  { value: "", label: "Все" },
];

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = isReportStatus(params.status) ? params.status : "OPEN";

  const result = await getAdminReports({
    page,
    status: params.status === "" ? undefined : status,
  });

  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Reports"
        title="Жалобы"
        description="Очередь пользовательских сигналов. Сначала смотри открытые жалобы и переходи к объекту модерации."
        meta={`Всего: ${result.total}`}
        actions={
          <form className="flex flex-wrap gap-2 rounded-full border border-border/60 bg-white/50 p-1">
          <select
            name="status"
            defaultValue={params.status ?? "OPEN"}
            className="h-10 rounded-full border border-transparent bg-white px-4 text-sm outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm"
          >
            Показать
          </button>
        </form>
        }
      />

      <div className="space-y-4">
        {result.items.map((report) => (
          <article
            key={report.id}
            className="rounded-[26px] border border-border/70 bg-white/50 p-5 transition hover:bg-white/70"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge label={report.status} tone={report.status === "OPEN" ? "danger" : "neutral"} />
                  <AdminStatusBadge label={report.targetType} />
                </div>
                <h3 className="mt-3 text-lg font-bold text-[#241713]">
                  {getReportReasonLabel(report.reason)}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  От {report.reporter.name} · {report.createdAt.toLocaleString("ru-RU")}
                </p>
              </div>
              {report.targetType === "LISTING" ? (
                <Link
                  href={`/admin/listings/${report.targetId}`}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-primary transition hover:bg-muted"
                >
                  Объявление
                </Link>
              ) : null}
            </div>

            {report.details ? (
              <p className="mt-4 rounded-2xl border border-border/60 bg-muted/45 p-4 text-sm leading-6 text-muted-foreground">
                {report.details}
              </p>
            ) : null}

            <div className="mt-4 max-w-sm">
              <ReportAdminActions
                reportId={report.id}
                status={report.status}
                listingId={report.targetType === "LISTING" ? report.targetId : undefined}
              />
            </div>
          </article>
        ))}
      </div>

      {result.items.length === 0 ? (
        <AdminEmptyState
          title="Жалоб пока нет"
          description="Когда пользователь пожалуется на объявление, жалоба появится здесь."
        />
      ) : null}

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/reports"
        searchParams={{
          status: params.status ?? "OPEN",
        }}
      />
    </AdminPanel>
  );
}

function isReportStatus(value: string | undefined): value is ReportStatus {
  return value === "OPEN" || value === "REVIEWED" || value === "DISMISSED";
}
