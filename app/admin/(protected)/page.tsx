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
        title="Панель модерации"
        description="Быстрый обзор рисков: открытые жалобы, заблокированные объявления и пользователи."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Открытые жалобы"
          value={stats.openReports}
          href="/admin/reports?status=OPEN"
          description="Требуют решения"
          tone={stats.openReports > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Активные объявления"
          value={stats.activeListings}
          href="/admin/listings?status=ACTIVE"
          description="Видны покупателям"
        />
        <StatCard
          label="Заблокированные"
          value={stats.blockedListings}
          href="/admin/listings?status=BLOCKED"
          description="Скрыты из каталога"
          tone={stats.blockedListings > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="Заблокированные пользователи"
          value={stats.bannedUsers}
          href="/admin/users?banned=1"
          description="Не могут войти"
          tone={stats.bannedUsers > 0 ? "danger" : "neutral"}
        />
      </section>

      <AdminPanel>
        <AdminPageHeader
          title="Последние действия"
          description="Audit log помогает быстро понять, кто и что менял в модерации."
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
      ? "border-red-200 bg-red-50/80"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50/80"
        : "border-white/70 bg-[#fffaf7]/95";

  return (
    <Link
      href={href}
      className={`rounded-[28px] border p-5 shadow-[0_18px_60px_rgba(36,23,19,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(36,23,19,0.12)] ${toneClass}`}
    >
      <p className="text-sm font-semibold text-[#241713]">{label}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}
