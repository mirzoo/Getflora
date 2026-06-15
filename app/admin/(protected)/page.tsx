import Link from "next/link";

import {
  AdminActionLogItem,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
} from "@/features/admin/components/admin-ui";
import { getRecentAdminActions } from "@/features/admin/services/audit-log";
import { getAdminDashboardStats } from "@/features/admin/services/admin-repository";

export default async function AdminDashboardPage() {
  const [stats, recentActions] = await Promise.all([
    getAdminDashboardStats(),
    getRecentAdminActions(8),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Dashboard"
        title="Пульс маркетплейса"
        description="Короткий обзор ликвидности, продаж и модерации. Поведенческие цели смотри в Яндекс Метрике."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Активные объявления"
          value={stats.activeListings}
          href="/admin/listings?status=ACTIVE"
          description="Видны покупателям"
        />
        <StatCard
          label="Новые за 24 часа"
          value={stats.newListings24h}
          href="/admin/listings"
          description="Свежие публикации"
        />
        <StatCard
          label="Продано за 7 дней"
          value={stats.soldListings7d}
          href="/admin/listings?status=SOLD"
          description="Отмечены продавцами"
        />
        <StatCard
          label="Открытые жалобы"
          value={stats.openReports}
          href="/admin/reports?status=OPEN"
          description="Требуют решения"
          tone={stats.openReports > 0 ? "danger" : "neutral"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <AdminPanel>
          <AdminPageHeader
            title="Воронка за 7 дней"
            description="Серверные события из БД: публикации, чаты, сообщения и продажи."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricBlock
              label="Объявления"
              value={stats.newListings7d}
              caption="Созданы"
            />
            <MetricBlock
              label="Объявления с чатом"
              value={stats.contactedListings7d}
              caption={`${stats.listingToContactRate7d}% от новых`}
            />
            <MetricBlock
              label="Продано"
              value={stats.soldListings7d}
              caption={`${stats.listingToSoldRate7d}% от новых`}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CompactMetric
              label="Диалоги за 24 часа"
              value={stats.conversations24h}
            />
            <CompactMetric
              label="Сообщения за 24 часа"
              value={stats.messages24h}
            />
            <CompactMetric
              label="Диалоги за 7 дней"
              value={stats.conversations7d}
            />
            <CompactMetric
              label="Сообщения за 7 дней"
              value={stats.messages7d}
            />
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPageHeader
            title="Операции"
            description="Что требует внимания и что изменилось недавно."
          />
          <div className="mt-5 space-y-3">
            <StatusRow label="Открытые жалобы" value={stats.openReports} href="/admin/reports?status=OPEN" />
            <StatusRow label="Заблокированные объявления" value={stats.blockedListings} href="/admin/listings?status=BLOCKED" />
            <StatusRow label="Заблокированные пользователи" value={stats.bannedUsers} href="/admin/users?banned=1" />
            <StatusRow label="Новые пользователи за 7 дней" value={stats.newUsers7d} href="/admin/users" />
            <StatusRow label="Снято/истекло за 7 дней" value={stats.expiredListings7d} href="/admin/listings?status=EXPIRED" />
          </div>
        </AdminPanel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <AdminPanel>
          <AdminPageHeader
            title="Статусы объявлений"
            description="Текущий состав каталога и скрытых объявлений."
          />
          <div className="mt-5 space-y-3">
            <StatusRow label="Активные" value={stats.statusCounts.ACTIVE ?? 0} href="/admin/listings?status=ACTIVE" />
            <StatusRow label="Проданные" value={stats.statusCounts.SOLD ?? 0} href="/admin/listings?status=SOLD" />
            <StatusRow label="Истекшие" value={stats.statusCounts.EXPIRED ?? 0} href="/admin/listings?status=EXPIRED" />
            <StatusRow label="Заблокированные" value={stats.statusCounts.BLOCKED ?? 0} href="/admin/listings?status=BLOCKED" />
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPageHeader
            title="Последние действия"
            description="Audit log модерации: блокировки, жалобы и изменения статусов."
          />
          {recentActions.length ? (
            <ul className="mt-4 space-y-3">
              {recentActions.map((item) => (
                <AdminActionLogItem
                  key={item.id}
                  action={item.action}
                  targetType={item.targetType}
                  targetId={item.targetId}
                  createdAt={item.createdAt}
                  adminName={item.admin.name}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <AdminEmptyState
                title="Действий пока нет"
                description="Когда ты заблокируешь объявление, обработаешь жалобу или забанишь пользователя, запись появится здесь."
              />
            </div>
          )}
        </AdminPanel>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Заблокированные"
          value={stats.blockedListings}
          href="/admin/listings?status=BLOCKED"
          description="Скрыты из каталога"
          tone={stats.blockedListings > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Всего продано"
          value={stats.soldListings}
          href="/admin/listings?status=SOLD"
          description="Исторически"
        />
        <StatCard
          label="Истекшие"
          value={stats.expiredListings}
          href="/admin/listings?status=EXPIRED"
          description="Сняты из каталога"
        />
        <StatCard
          label="Продано за 24 часа"
          value={stats.soldListings24h}
          href="/admin/listings?status=SOLD"
          description="Свежие сделки"
        />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  description,
  tone = "neutral",
}: {
  label: string;
  value: number;
  href: string;
  description: string;
  tone?: "neutral" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-gf-status-negative-pale-hover bg-gf-bg-base"
      : tone === "warning"
        ? "border-gf-status-warning-pale-hover bg-gf-bg-base"
        : "border-gf-border bg-gf-bg-base";

  return (
    <Link
      href={href}
      className={`rounded-[8px] border p-5 transition-colors hover:border-gf-border-hover ${toneClass}`}
    >
      <p className="text-sm font-semibold text-gf-text-primary">{label}</p>
      <p className="mt-3 text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function MetricBlock({
  label,
  value,
  caption,
}: {
  label: string;
  value: number;
  caption: string;
}) {
  return (
    <div className="rounded-[8px] border border-gf-border bg-gf-bg-alt p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-gf-text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[8px] border border-gf-border bg-gf-bg-alt px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-gf-text-primary">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-[8px] border border-gf-border bg-gf-bg-alt px-4 py-3 text-sm transition-colors hover:border-gf-border-hover"
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-gf-text-primary">{value}</span>
    </Link>
  );
}
