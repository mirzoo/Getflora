import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminStatusBadge,
} from "@/features/admin/components/admin-ui";
import { getAdminUsers } from "@/features/admin/services/admin-repository";

type AdminUsersPageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    banned?: string;
  }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const query = params.q;
  const bannedOnly = params.banned === "1";

  const result = await getAdminUsers({
    page,
    query,
    bannedOnly,
  });

  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Accounts"
        title="Пользователи"
        description="Ищи аккаунты, проверяй активность и блокируй нарушителей вместе с их активными объявлениями."
        meta={`Всего: ${result.total}`}
        actions={
          <form className="flex flex-wrap gap-2 rounded-[8px] border border-gf-border bg-gf-bg-alt p-1">
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Имя, email или телефон"
            className="h-10 min-w-56 rounded-[6px] border border-transparent bg-gf-bg-base px-4 text-sm outline-none ring-primary/30 transition focus:border-primary/40 focus:ring-2"
          />
          <label className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-gf-bg-base px-4 text-sm font-medium">
            <input type="checkbox" name="banned" value="1" defaultChecked={bannedOnly} />
            Только заблокированные
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-[6px] bg-gf-text-primary px-5 text-sm font-semibold text-gf-bg-base shadow-sm transition hover:bg-gf-neutral-dark-3"
          >
            Найти
          </button>
        </form>
        }
      />

      <div className="overflow-x-auto rounded-[8px] border border-gf-border bg-gf-bg-base">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gf-bg-alt">
            <tr className="border-b border-border/70 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Имя</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="px-4 py-3 font-semibold">Объявления</th>
              <th className="px-4 py-3 font-semibold">Жалобы</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((user) => (
              <tr key={user.id} className="border-b border-gf-border transition hover:bg-gf-bg-alt">
                <td className="px-4 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-semibold text-gf-text-primary hover:underline">
                    {user.name}
                  </Link>
                </td>
                <td className="px-4 py-4 text-muted-foreground">{user.email ?? "—"}</td>
                <td className="px-4 py-4">
                  {user.bannedAt ? (
                    <AdminStatusBadge label="Заблокирован" tone="danger" />
                  ) : (
                    <AdminStatusBadge label="Активен" tone="success" />
                  )}
                </td>
                <td className="px-4 py-4 font-semibold">{user._count.listings}</td>
                <td className="px-4 py-4 font-semibold">{user._count.reports}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.items.length === 0 ? (
        <AdminEmptyState
          title="Пользователи не найдены"
          description="Проверь поисковую строку или выключи фильтр заблокированных аккаунтов."
        />
      ) : null}

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/users"
        searchParams={{
          q: query,
          banned: bannedOnly ? "1" : undefined,
        }}
      />
    </AdminPanel>
  );
}
