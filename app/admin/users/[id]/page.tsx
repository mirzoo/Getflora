import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminInfoBlock,
  AdminPanel,
  AdminStatusBadge,
  UserAdminActions,
} from "@/features/admin/components/admin-ui";
import { getAdminUserById } from "@/features/admin/services/admin-repository";
import { formatPrice } from "@/lib/format";
import { shouldBypassNextImageOptimizer } from "@/lib/images";

type AdminUserDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminUserDetailsPage({ params }: AdminUserDetailsPageProps) {
  const { id } = await params;
  const user = await getAdminUserById(id);

  if (!user) {
    notFound();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <AdminPanel className="space-y-6">
        <div>
          <Link href="/admin/users" className="text-sm font-medium text-muted-foreground hover:text-primary">
            ← К списку пользователей
          </Link>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#241713]">{user.name}</h2>
          <div className="mt-2">
            {user.bannedAt ? (
              <AdminStatusBadge label="Заблокирован" tone="danger" />
            ) : (
              <AdminStatusBadge label="Активен" tone="success" />
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInfoBlock label="Email" value={user.email ?? "—"} />
          <AdminInfoBlock label="Телефон" value={user.phone ?? "—"} />
          <AdminInfoBlock label="Регистрация" value={user.createdAt.toLocaleString("ru-RU")} />
          <AdminInfoBlock label="Причина бана" value={user.banReason ?? "—"} />
        </div>

        <section>
          <h3 className="font-bold text-[#241713]">Объявления пользователя</h3>
          {user.listings.length ? (
            <div className="mt-4 space-y-3">
              {user.listings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/admin/listings/${listing.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white/55 p-3 transition hover:bg-white"
                >
                  {listing.images[0] ? (
                    <Image
                      src={listing.images[0].url}
                      alt={listing.title}
                      width={56}
                      height={56}
                      className="size-14 rounded-xl object-cover"
                      unoptimized={shouldBypassNextImageOptimizer(listing.images[0].url)}
                    />
                  ) : (
                    <div className="size-14 rounded-xl bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#241713]">{listing.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {listing.status} · {formatPrice(listing.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-dashed border-border bg-white/45 px-4 py-5 text-sm text-muted-foreground">
              Объявлений нет.
            </p>
          )}
        </section>
      </AdminPanel>

      <aside className="space-y-6">
        {user.bannedBy ? (
          <AdminPanel>
            <h3 className="font-bold text-[#241713]">Заблокировал</h3>
            <p className="mt-2 text-sm">{user.bannedBy.name}</p>
            <p className="text-sm text-muted-foreground">{user.bannedBy.email ?? "—"}</p>
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <h3 className="font-bold text-[#241713]">Действия модерации</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Бан сбрасывает сессии пользователя и блокирует активные объявления.
          </p>
          <div className="mt-4">
            <UserAdminActions userId={user.id} isBanned={Boolean(user.bannedAt)} />
          </div>
        </AdminPanel>
      </aside>
    </div>
  );
}
