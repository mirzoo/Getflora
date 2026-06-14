"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TriangleAlert, X } from "lucide-react";

import { ListingPhoto } from "@/features/listings/components/listing-photo";
import { getFreshnessValueLabel } from "@/features/listings/utils/freshness";
import { getPriceRange, trackAnalyticsEvent } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ListingCardModel } from "@/types/listing";

type ListingDetailsModalProps = {
  listing: ListingCardModel | null;
  isAuthenticated: boolean;
  isOwnListing: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onEdit?: (listing: ListingCardModel) => void;
  onReport?: (listing: ListingCardModel) => void;
};

export function ListingDetailsModal({
  listing,
  isAuthenticated,
  isOwnListing,
  onClose,
  onRequireAuth,
  onEdit,
  onReport,
}: ListingDetailsModalProps) {
  const images = useMemo(
    () => (listing?.imageUrls?.length ? listing.imageUrls : listing ? [listing.imageUrl] : []),
    [listing],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [images]);

  useEffect(() => {
    if (!listing) {
      return;
    }

    trackAnalyticsEvent("listing_viewed", {
      listingId: listing.id,
      city: listing.city,
      listingType: listing.type,
      status: listing.status,
      priceRange: getPriceRange(listing.price),
    });
  }, [listing]);

  useEffect(() => {
    if (!listing) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [listing]);

  if (!listing) {
    return null;
  }

  const activeImageUrl = images[activeImageIndex] ?? listing.imageUrl;
  const freshnessLabel = getFreshnessValueLabel(listing.receivedAt, listing.freshnessScore);
  const primaryActionLabel = listing.type === "auction" ? "Сделать ставку" : "Купить";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-[8px] md:place-items-center md:p-5"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 grid max-h-[92vh] w-full gap-6 overflow-y-auto rounded-t-[40px] bg-background p-2 shadow-2xl md:max-w-[1140px] md:grid-cols-[minmax(360px,486px)_minmax(320px,1fr)] md:gap-12 md:rounded-[48px] md:p-2 lg:gap-16"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative min-h-[360px] overflow-hidden rounded-[36px] bg-muted md:h-[574px] md:rounded-[40px]">
          <ListingPhoto
            src={activeImageUrl}
            alt={listing.imageAlt}
            width={972}
            height={1148}
            className="size-full object-cover"
            priority
            sizes="(min-width: 768px) 486px, 100vw"
          />

          {images.length > 1 ? (
            <>
              <div className="absolute inset-0 z-10 flex" onMouseLeave={() => setActiveImageIndex(0)}>
                {images.map((imageUrl, index) => (
                  <button
                    key={`${listing.id}-details-hover-${imageUrl}`}
                    className="h-full flex-1 cursor-pointer"
                    type="button"
                    onMouseEnter={() => setActiveImageIndex(index)}
                    onFocus={() => setActiveImageIndex(index)}
                    aria-label={`Показать фото ${index + 1}`}
                  />
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center gap-1">
                {images.map((imageUrl, index) => (
                  <span
                    key={`${listing.id}-details-dot-${imageUrl}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === activeImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/70",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <button
          className="absolute right-6 top-6 z-30 grid size-12 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2] md:right-6 md:top-6"
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X className="size-5" />
        </button>

        <div className="flex min-w-0 flex-col px-4 pb-6 pt-0 md:justify-center md:px-0 md:pb-0 md:pr-16">
          <div>
            <h2 className="max-w-[450px] text-gf-body-l font-bold leading-[normal] text-gf-text-primary">
              {listing.title}
            </h2>
            <strong className="mt-1 block text-gf-h3 font-bold leading-[normal] text-gf-text-primary">
              {formatPrice(listing.price)}
            </strong>
          </div>

          {listing.type === "auction" ? (
            <DetailBlock className="mt-8" label="Аукцион закончится" value={listing.auctionEndsAt ?? "—"} />
          ) : null}

          <div className={cn("grid gap-3", listing.type === "auction" ? "mt-3" : "mt-8")}>
            <DetailBlock label="Когда получен" value={freshnessLabel} valueClassName="text-gf-text-positive" />
            <DetailBlock label="Количество цветов" value={String(listing.flowersCount)} />
            <DetailBlock label="Состав" value={listing.flowerTypes.join(", ")} />
            <DetailBlock label="Посмотрели" value="5 человек" />
            <DetailBlock label="Описание" value={listing.description} />
          </div>

          <div className="mt-8 flex items-center gap-2">
            {isOwnListing ? (
              <button
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-accent px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent transition-colors hover:bg-gf-bg-accent-hover disabled:pointer-events-none disabled:opacity-50 md:max-w-[336px]"
                type="button"
                disabled={listing.status !== "active"}
                onClick={() => onEdit?.(listing)}
              >
                Редактировать
              </button>
            ) : isAuthenticated ? (
              <Link
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-accent px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent transition-colors hover:bg-gf-bg-accent-hover md:max-w-[336px]"
                href={`/messages/${listing.id}?seller=${listing.sellerId ?? listing.sellerName}`}
                onClick={() => {
                  trackAnalyticsEvent("seller_contacted", {
                    listingId: listing.id,
                    city: listing.city,
                    listingType: listing.type,
                    priceRange: getPriceRange(listing.price),
                  });
                }}
              >
                {primaryActionLabel}
              </Link>
            ) : (
              <button
                className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-accent px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent transition-colors hover:bg-gf-bg-accent-hover md:max-w-[336px]"
                type="button"
                onClick={() => {
                  trackAnalyticsEvent("auth_required", {
                    source: "listing_primary_action",
                    listingId: listing.id,
                    listingType: listing.type,
                  });
                  onRequireAuth();
                }}
              >
                {primaryActionLabel}
              </button>
            )}

            {!isOwnListing ? (
              <button
                className="grid size-12 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2]"
                type="button"
                aria-label="Пожаловаться"
                onClick={() => onReport?.(listing)}
              >
                <TriangleAlert className="size-5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  valueClassName,
  className,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">{label}</p>
      <p className={cn("mt-1 text-gf-body-m font-normal leading-[normal] text-gf-text-primary", valueClassName)}>
        {value}
      </p>
    </div>
  );
}
