import type { ListingStatus } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPagination,
  AdminPanel,
  AdminStatusBadge,
} from "@/features/admin/components/admin-ui";
import { getAdminListings } from "@/features/admin/services/admin-repository";
import { formatPrice } from "@/lib/format";
import { shouldBypassNextImageOptimizer } from "@/lib/images";

type AdminListingsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
  }>;
};

const statusOptions: Array<{ value: ListingStatus | ""; label: string }> = [
  { value: "", label: "Все статусы" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "BLOCKED", label: "BLOCKED" },
  { value: "SOLD", label: "SOLD" },
  { value: "EXPIRED", label: "EXPIRED" },
  { value: "DRAFT", label: "DRAFT" },
];

export default async function AdminListingsPage({ searchParams }: AdminListingsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = isListingStatus(params.status) ? params.status : undefined;
  const query = params.q;

  const result = await getAdminListings({
    page,
    status,
    query,
  });

  return (
    <AdminPanel className="space-y-6">
      <AdminPageHeader
        eyebrow="Marketplace"
        title="Объявления"
        description="Проверяй карточки, статусы и продавцов. Заблокированные объявления скрыты из публичного каталога."
        meta={`Всего: ${result.total}`}
        actions={
          <form className="flex flex-wrap gap-2 rounded-[8px] border border-gf-border bg-gf-bg-alt p-1">
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Поиск"
            className="h-10 min-w-48 rounded-[6px] border border-transparent bg-gf-bg-base px-4 text-sm outline-none ring-primary/30 transition focus:border-primary/40 focus:ring-2"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 rounded-[6px] border border-transparent bg-gf-bg-base px-4 text-sm outline-none"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
              <th className="px-4 py-3 font-semibold">Объявление</th>
              <th className="px-4 py-3 font-semibold">Продавец</th>
              <th className="px-4 py-3 font-semibold">Статус</th>
              <th className="px-4 py-3 font-semibold">Цена</th>
              <th className="px-4 py-3 font-semibold">Город</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((listing) => (
              <tr key={listing.id} className="border-b border-gf-border transition hover:bg-gf-bg-alt">
                <td className="px-4 py-4">
                  <Link href={`/admin/listings/${listing.id}`} className="flex items-center gap-3">
                    {listing.images[0] ? (
                      <Image
                        src={listing.images[0].url}
                        alt={listing.title}
                        width={48}
                        height={48}
                        className="size-12 rounded-xl object-cover"
                        unoptimized={shouldBypassNextImageOptimizer(listing.images[0].url)}
                      />
                    ) : (
                      <div className="size-12 rounded-[8px] bg-gf-bg-alt" />
                    )}
                    <span className="font-semibold text-gf-text-primary">{listing.title}</span>
                  </Link>
                </td>
                <td className="px-4 py-4">
                  <Link href={`/admin/users/${listing.seller.id}`} className="font-medium hover:underline">
                    {listing.seller.name}
                  </Link>
                  {listing.seller.bannedAt ? (
                    <div className="mt-1">
                      <AdminStatusBadge label="Продавец заблокирован" tone="danger" />
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <AdminStatusBadge
                    label={listing.status}
                    tone={listing.status === "BLOCKED" ? "danger" : listing.status === "ACTIVE" ? "success" : "neutral"}
                  />
                </td>
                <td className="px-4 py-4 font-semibold">{formatPrice(listing.price)}</td>
                <td className="px-4 py-4 text-muted-foreground">{listing.city}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.items.length === 0 ? (
        <AdminEmptyState
          title="Объявления не найдены"
          description="Попробуй сбросить фильтр по статусу или изменить поисковый запрос."
        />
      ) : null}

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        basePath="/admin/listings"
        searchParams={{
          q: query,
          status: status ?? undefined,
        }}
      />
    </AdminPanel>
  );
}

function isListingStatus(value: string | undefined): value is ListingStatus {
  return value === "ACTIVE" || value === "BLOCKED" || value === "SOLD" || value === "EXPIRED" || value === "DRAFT";
}
