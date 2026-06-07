import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  AdminInfoBlock,
  AdminPanel,
  AdminStatusBadge,
  ListingAdminActions,
} from "@/features/admin/components/admin-ui";
import { getAdminListingById } from "@/features/admin/services/admin-repository";
import { formatPrice } from "@/lib/format";

type AdminListingDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminListingDetailsPage({ params }: AdminListingDetailsPageProps) {
  const { id } = await params;
  const listing = await getAdminListingById(id);

  if (!listing) {
    notFound();
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
      <AdminPanel className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href="/admin/listings" className="text-sm font-medium text-muted-foreground hover:text-primary">
              ← К списку объявлений
            </Link>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#241713]">{listing.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminStatusBadge
                label={listing.status}
                tone={listing.status === "BLOCKED" ? "danger" : "neutral"}
              />
              <AdminStatusBadge label={listing.type} />
            </div>
          </div>
          <p className="rounded-2xl bg-white/70 px-4 py-3 text-2xl font-bold shadow-sm">
            {formatPrice(listing.price)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {listing.images.length ? listing.images.map((image) => (
            <Image
              key={image.id}
              src={image.url}
              alt={listing.title}
              width={400}
              height={400}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          )) : (
            <div className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-border bg-white/50 text-sm text-muted-foreground">
              Нет фото
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminInfoBlock label="Город" value={listing.city} />
          <AdminInfoBlock label="Район" value={listing.area} />
          <AdminInfoBlock label="Создано" value={listing.createdAt.toLocaleString("ru-RU")} />
          <AdminInfoBlock label="Обновлено" value={listing.updatedAt.toLocaleString("ru-RU")} />
          {listing.soldAt ? (
            <AdminInfoBlock label="Продано" value={listing.soldAt.toLocaleString("ru-RU")} />
          ) : null}
        </div>

        <section>
          <h3 className="font-bold text-[#241713]">Описание</h3>
          <p className="mt-2 leading-6 text-muted-foreground">{listing.description}</p>
        </section>
      </AdminPanel>

      <aside className="space-y-6">
        <AdminPanel>
          <h3 className="font-bold text-[#241713]">Продавец</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <Link href={`/admin/users/${listing.seller.id}`} className="font-medium hover:underline">
                {listing.seller.name}
              </Link>
            </p>
            <p className="text-muted-foreground">{listing.seller.email ?? "Email не указан"}</p>
            {listing.seller.bannedAt ? (
              <AdminStatusBadge label="Заблокирован" tone="danger" />
            ) : null}
          </div>
        </AdminPanel>

        {listing.status === "SOLD" ? (
          <AdminPanel>
            <h3 className="font-bold text-[#241713]">Покупатель</h3>
            {listing.soldToBuyer ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  <Link href={`/admin/users/${listing.soldToBuyer.id}`} className="font-medium hover:underline">
                    {listing.soldToBuyer.name}
                  </Link>
                </p>
                <p className="text-muted-foreground">{listing.soldToBuyer.email ?? "Email не указан"}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Продано без привязки к чату — покупатель не указан.
              </p>
            )}
          </AdminPanel>
        ) : null}

        <AdminPanel>
          <h3 className="font-bold text-[#241713]">Действия модерации</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Эти действия меняют видимость объявления и пишутся в audit log.
          </p>
          <div className="mt-4">
            <ListingAdminActions listingId={listing.id} status={listing.status} />
          </div>
        </AdminPanel>
      </aside>
    </div>
  );
}
