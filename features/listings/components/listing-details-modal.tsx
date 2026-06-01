"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatListingPublishedAt, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ListingCardModel } from "@/types/listing";

type ListingDetailsModalProps = {
  listing: ListingCardModel | null;
  isFavorite: boolean;
  isAuthenticated: boolean;
  isOwnListing: boolean;
  onClose: () => void;
  onToggleFavorite: (listingId: string) => void;
  onRequireAuth: () => void;
  onEdit?: (listing: ListingCardModel) => void;
};

export function ListingDetailsModal({
  listing,
  isFavorite,
  isAuthenticated,
  isOwnListing,
  onClose,
  onToggleFavorite,
  onRequireAuth,
  onEdit,
}: ListingDetailsModalProps) {
  const images = useMemo(
    () => (listing?.imageUrls?.length ? listing.imageUrls : listing ? [listing.imageUrl] : []),
    [listing],
  );
  const [activeImageUrl, setActiveImageUrl] = useState("");

  useEffect(() => {
    setActiveImageUrl(images[0] ?? "");
  }, [images]);

  if (!listing) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/30 p-0 lg:place-items-center lg:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-background p-5 shadow-2xl lg:max-w-4xl lg:rounded-[28px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">{listing.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="size-5" />
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-[22px] bg-muted">
              <Image
                src={activeImageUrl || listing.imageUrl}
                alt={listing.imageAlt}
                width={900}
                height={900}
                className="aspect-square w-full object-cover"
                priority
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {images.map((imageUrl, index) => (
                <button
                  key={`${listing.id}-thumb-${imageUrl}`}
                  className={cn(
                    "overflow-hidden rounded-xl bg-muted ring-offset-2 transition",
                    activeImageUrl === imageUrl && "ring-2 ring-primary",
                  )}
                  type="button"
                  onClick={() => setActiveImageUrl(imageUrl)}
                  aria-label={`Показать фото ${index + 1}`}
                >
                  <Image
                    src={imageUrl}
                    alt={listing.imageAlt}
                    width={180}
                    height={180}
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">
                {listing.type === "auction" ? "Текущая цена" : "Цена"}
              </p>
              <strong className="text-3xl">{formatPrice(listing.price)}</strong>
            </div>

            {listing.type === "auction" ? (
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Аукцион закончится</p>
                <strong>{listing.auctionEndsAt}</strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ставок: {listing.bidsCount ?? 0}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Цветов" value={String(listing.flowersCount)} />
              <InfoItem label="Свежесть" value={`${listing.freshnessScore}%`} />
              <InfoItem label="Продавец" value={listing.sellerName} />
              <InfoItem
                label="Опубликовано"
                value={formatListingPublishedAt(listing.publishedAt, listing.publishedAgo)}
              />
            </div>

            <section>
              <h3 className="mb-2 font-bold">Состав</h3>
              <p className="text-muted-foreground">{listing.flowerTypes.join(", ")}</p>
            </section>

            <section>
              <h3 className="mb-2 font-bold">Описание</h3>
              <p className="leading-6 text-muted-foreground">{listing.description}</p>
            </section>

            <div className="grid gap-2">
              {isOwnListing ? (
                <Button
                  type="button"
                  disabled={listing.status !== "active"}
                  onClick={() => onEdit?.(listing)}
                >
                  Редактировать
                </Button>
              ) : isAuthenticated ? (
                <Button asChild>
                  <Link
                    href={`/messages/${listing.id}?seller=${listing.sellerId ?? listing.sellerName}`}
                  >
                    {listing.type === "auction" ? "Сделать ставку" : "Купить"}
                  </Link>
                </Button>
              ) : (
                <Button type="button" onClick={onRequireAuth}>
                  {listing.type === "auction" ? "Сделать ставку" : "Купить"}
                </Button>
              )}
              <div className={cn("grid gap-2", isOwnListing ? "grid-cols-1" : "grid-cols-2")}>
                {!isOwnListing ? (
                  <Button
                    variant="secondary"
                    onClick={() => onToggleFavorite(listing.id)}
                  >
                    <Heart className={cn("size-4", isFavorite && "fill-current text-primary")} />
                    {isFavorite ? "В избранном" : "Избранное"}
                  </Button>
                ) : null}
                <Button variant="secondary">
                  <Share2 className="size-4" />
                  Поделиться
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
