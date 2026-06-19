"use client";

import Link from "next/link";
import Image from "next/image";
import type { ImageProps } from "next/image";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TriangleAlert, X } from "lucide-react";

import chevronLeftIcon from "@/assets/icon/icn_m_chevron-left.svg";
import chevronRightIcon from "@/assets/icon/icn_m_chevron-right.svg";
import { ListingPhoto } from "@/features/listings/components/listing-photo";
import { getCompactFreshnessLabel } from "@/features/listings/utils/freshness";
import { getPriceRange, trackAnalyticsEvent } from "@/lib/analytics";
import { formatAuctionTimeLeft, formatPrice, getAuctionTimeTone } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ListingCardModel } from "@/types/listing";

type ListingDetailsModalProps = {
  listing: ListingCardModel | null;
  isAuthenticated: boolean;
  isOwnListing: boolean;
  onClose: () => void;
  onRequireAuth: () => void;
  onEdit?: (listing: ListingCardModel) => void;
  onMarkSold?: (listingId: string) => void;
  onReport?: (listing: ListingCardModel) => void;
};

export function ListingDetailsModal({
  listing,
  isAuthenticated,
  isOwnListing,
  onClose,
  onRequireAuth,
  onEdit,
  onMarkSold,
  onReport,
}: ListingDetailsModalProps) {
  const images = useMemo(
    () => (listing?.imageUrls?.length ? listing.imageUrls : listing ? [listing.imageUrl] : []),
    [listing],
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setActiveImageIndex(0);
    setIsConfirmingSale(false);
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

  const hasGalleryNavigation = images.length > 1;
  const freshnessLabel = getCompactFreshnessLabel(listing.receivedAt, listing.freshnessScore);
  const primaryActionLabel = listing.type === "auction" ? "Сделать ставку" : "Купить";
  const isAuction = listing.type === "auction";

  function showPreviousImage() {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  }

  function showNextImage() {
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasGalleryNavigation) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!hasGalleryNavigation || !touchStartRef.current) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNextImage();
      return;
    }

    showPreviousImage();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid bg-gf-bg-base p-0 md:place-items-center md:bg-black/60 md:p-5 md:backdrop-blur-[8px]"
      onClick={onClose}
    >
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        aria-label="Закрыть окно"
        onClick={onClose}
      />
      <div
        className="relative z-10 grid h-full w-full gap-6 overflow-y-auto bg-background p-2 md:h-auto md:max-h-[92vh] md:max-w-[1140px] md:grid-cols-[minmax(360px,486px)_minmax(320px,1fr)] md:gap-12 md:rounded-[48px] md:p-2 md:shadow-2xl lg:gap-16"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="group/gallery relative h-[302px] touch-pan-y overflow-hidden rounded-[32px] bg-muted md:h-[574px] md:rounded-[40px]"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex size-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
          >
            {images.map((imageUrl, index) => (
              <ListingPhoto
                key={`${listing.id}-details-slide-${imageUrl}`}
                src={imageUrl}
                alt={index === 0 ? listing.imageAlt : `${listing.imageAlt}, фото ${index + 1}`}
                width={972}
                height={1148}
                className="size-full shrink-0 object-cover"
                priority={index === 0}
                sizes="(min-width: 768px) 486px, 100vw"
              />
            ))}
          </div>

          {hasGalleryNavigation ? (
            <>
              <GalleryArrowButton
                className="left-4"
                icon={chevronLeftIcon}
                label="Предыдущее фото"
                onClick={showPreviousImage}
              />
              <GalleryArrowButton
                className="right-4"
                icon={chevronRightIcon}
                label="Следующее фото"
                onClick={showNextImage}
              />
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
            <h2 className="max-w-[450px] text-gf-body-l font-semibold leading-[normal] text-gf-text-primary md:font-bold">
              {listing.title}
            </h2>
            {isAuction ? (
              <AuctionDetailsSummary listing={listing} />
            ) : (
              <strong className="mt-1 block text-gf-h3 font-bold leading-[normal] text-gf-text-primary">
                {formatPrice(listing.price)}
              </strong>
            )}
          </div>

          <div className={cn("grid gap-3 py-8", isAuction ? "mt-0" : "mt-0 md:mt-8 md:py-0")}>
            <DetailBlock label="Количество цветов" value={String(listing.flowersCount)} />
            <DetailBlock label="Состав" value={listing.flowerTypes.join(", ")} />
            <DetailBlock label="Свежесть" value={freshnessLabel} />
            <DetailBlock label="Посмотрели" value="5 человек" />
            <DetailBlock label="Описание" value={listing.description} />
          </div>

          <div className="flex items-center gap-2 md:mt-8">
            {isOwnListing ? (
              isConfirmingSale ? (
                <div className="grid flex-1 gap-3 md:max-w-[420px]">
                  <p className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary">
                    Уверены, что хотите отметить объявление как проданное? Вернуть его обратно не получится.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-accent px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent transition-colors hover:bg-gf-bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                      type="button"
                      disabled={listing.status !== "active"}
                      onClick={() => onMarkSold?.(listing.id)}
                    >
                      Да, продать
                    </button>
                    <button
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-alt px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2]"
                      type="button"
                      onClick={() => setIsConfirmingSale(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-accent px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-on-accent transition-colors hover:bg-gf-bg-accent-hover disabled:pointer-events-none disabled:opacity-50 md:max-w-[210px]"
                    type="button"
                    disabled={listing.status !== "active"}
                    onClick={() => setIsConfirmingSale(true)}
                  >
                    Продать
                  </button>
                  <button
                    className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-gf-bg-alt px-6 text-gf-body-m font-medium leading-[normal] text-gf-text-primary transition-colors hover:bg-[#f2f2f2] disabled:pointer-events-none disabled:opacity-50 md:max-w-[210px]"
                    type="button"
                    disabled={listing.status !== "active"}
                    onClick={() => onEdit?.(listing)}
                  >
                    Редактировать
                  </button>
                </>
              )
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
              <ListingIconActionButton
                className="md:hidden"
                label="Пожаловаться"
                onClick={() => onReport?.(listing)}
              >
                <TriangleAlert className="size-5" />
              </ListingIconActionButton>
            ) : null}

            {!isOwnListing ? (
              <button
                className="hidden size-12 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2] md:grid"
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

function AuctionDetailsSummary({ listing }: { listing: ListingCardModel }) {
  const currentBid = listing.auctionCurrentBid ?? listing.price;
  const startPrice = listing.auctionStartPrice ?? listing.price;
  const hasCurrentBid = currentBid > startPrice || Boolean(listing.bidsCount);
  const timeTone = getAuctionTimeTone(listing.auctionEndsAt);

  return (
    <div className="mt-5 grid gap-4">
      <div className="grid grid-cols-2 gap-3 rounded-[12px] bg-gf-bg-alt p-4">
        <AuctionDetailsMetric
          label={hasCurrentBid ? "Текущая ставка" : "Начальная ставка"}
          value={formatPrice(currentBid)}
          valueClassName={hasCurrentBid ? "text-gf-text-positive" : "text-gf-text-primary"}
        />
        <AuctionDetailsMetric
          label="Осталось"
          value={formatAuctionTimeLeft(listing.auctionEndsAt)}
          valueClassName={cn({
            "text-gf-text-positive": timeTone === "positive",
            "text-gf-status-warning": timeTone === "warning",
            "text-gf-text-negative": timeTone === "negative",
          })}
        />
      </div>

      {listing.auctionUserBid ? (
        <AuctionDetailsMetric
          label="Ваша ставка"
          value={formatPrice(listing.auctionUserBid)}
          valueClassName={listing.auctionUserBidStatus === "outbid" ? "text-gf-text-negative" : "text-gf-text-primary"}
        />
      ) : null}
    </div>
  );
}

function AuctionDetailsMetric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
        {label}
      </p>
      <p className={cn("truncate text-gf-h5 font-extrabold leading-[normal]", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function ListingIconActionButton({
  children,
  className,
  label,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "grid size-12 shrink-0 place-items-center rounded-full bg-gf-bg-alt text-gf-text-primary transition-colors hover:bg-[#f2f2f2]",
        className,
      )}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function GalleryArrowButton({
  className,
  icon,
  label,
  onClick,
}: {
  className: string;
  icon: ImageProps["src"];
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "absolute top-1/2 z-20 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-gf-bg-base text-gf-text-primary opacity-0 shadow-[0_4px_12px_rgb(0_0_0/0.12)] transition-opacity group-hover/gallery:grid group-hover/gallery:opacity-100 focus-visible:grid focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent md:grid",
        className,
      )}
      type="button"
      aria-label={label}
      onClick={onClick}
    >
      <Image src={icon} alt="" width={20} height={20} className="size-5" />
    </button>
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
