"use client";

import { useRef, useState } from "react";

import { ListingPhoto } from "@/features/listings/components/listing-photo";
import { getCompactFreshnessLabel } from "@/features/listings/utils/freshness";
import type { ListingCardModel } from "@/types/listing";
import { formatAuctionTimeLeft, formatListingPublishedAt, formatPrice, getAuctionTimeTone } from "@/lib/format";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardModel;
  onOpen: (listing: ListingCardModel) => void;
};

export function ListingCard({
  listing,
  onOpen,
}: ListingCardProps) {
  const images = listing.imageUrls?.length ? listing.imageUrls : [listing.imageUrl];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSwipeRef = useRef(false);
  const freshnessBadge = getFreshnessBadge(listing.receivedAt, listing.freshnessScore);
  const isAuction = listing.type === "auction";
  const isSold = listing.status === "sold";

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (isSold || images.length <= 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    didSwipeRef.current = false;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (isSold || images.length <= 1 || !touchStartRef.current) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    didSwipeRef.current = true;
    setActiveImageIndex((current) => {
      if (deltaX < 0) {
        return Math.min(current + 1, images.length - 1);
      }

      return Math.max(current - 1, 0);
    });
  }

  function handleImageAreaClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (isSold) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (didSwipeRef.current) {
      event.preventDefault();
      event.stopPropagation();
      didSwipeRef.current = false;
      return;
    }

    onOpen(listing);
  }

  return (
    <article className="group w-full">
      <div
        className={cn(
          "relative h-[190px] w-full touch-pan-y overflow-hidden rounded-[24px] bg-muted md:h-[270px] md:rounded-[32px]",
          isSold && "bg-[#f12626]",
        )}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            "flex transition-transform duration-300 ease-out",
            isSold ? "absolute inset-x-0 top-0 bottom-[33px] rounded-b-[24px] md:rounded-b-[32px]" : "size-full",
          )}
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {images.map((imageUrl, index) => (
            <ListingPhoto
              key={`${listing.id}-slide-${imageUrl}`}
              src={imageUrl}
              alt={index === 0 ? listing.imageAlt : `${listing.imageAlt}, фото ${index + 1}`}
              width={520}
              height={520}
              className={cn(
                "size-full shrink-0 object-cover",
                isSold && "rounded-b-[24px] md:rounded-b-[32px]",
              )}
              priority={false}
              sizes="(min-width: 1440px) 290px, (min-width: 1024px) 290px, (min-width: 768px) calc((100vw - 104px) / 2), 50vw"
            />
          ))}
        </div>

        {isSold ? (
          <>
            <div className="absolute inset-x-0 top-0 bottom-[33px] z-10 rounded-b-[24px] bg-white/20 backdrop-blur-[12px] md:rounded-b-[32px]" />
            <div className="absolute inset-x-0 bottom-0 z-20 flex min-h-[33px] items-center justify-center px-4 py-2 text-gf-body-s font-medium leading-[normal] text-gf-text-on-accent">
              Продано
            </div>
          </>
        ) : (
          <div className="absolute inset-0 z-10 flex" onMouseLeave={() => setActiveImageIndex(0)}>
            {images.map((imageUrl, index) => (
              <button
                key={`${listing.id}-${imageUrl}`}
                className="h-full flex-1 cursor-pointer text-left"
                type="button"
                onMouseEnter={() => setActiveImageIndex(index)}
                onFocus={() => setActiveImageIndex(index)}
                onClick={handleImageAreaClick}
                aria-label={`Открыть объявление, фото ${index + 1}`}
              />
            ))}
          </div>
        )}

        {!isSold ? (
          <span
            className={cn(
              "absolute right-3 top-3 z-20 inline-flex h-7 items-center rounded-full bg-white/80 px-2.5 text-gf-body-xs font-medium leading-[normal] text-gf-text-primary shadow-[4px_0_8px_rgba(0,0,0,0.10)] backdrop-blur-[32px] md:right-5 md:top-5",
              freshnessBadge.className,
            )}
          >
            {freshnessBadge.label}
          </span>
        ) : null}

        {!isSold && images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1">
            {images.map((imageUrl, index) => (
              <span
                key={`${listing.id}-dot-${imageUrl}`}
                className={cn(
                  "h-1 rounded-full transition-all",
                  index === activeImageIndex ? "w-4 bg-white" : "w-1 bg-white/70",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-3">
        {isAuction ? (
          <AuctionCardPriceAndTime listing={listing} />
        ) : (
          <strong
            className={cn(
              "block text-gf-body-l font-black leading-[normal]",
              isSold ? "text-gf-text-secondary" : "text-gf-text-primary",
            )}
          >
            {formatPrice(listing.price)}
          </strong>
        )}
        <h2
          className={cn(
            "mt-2 line-clamp-2 text-gf-body-l font-normal leading-[normal]",
            isSold ? "text-gf-text-secondary" : "text-gf-text-primary",
          )}
        >
          {listing.title}
        </h2>
        <p className="mt-1 truncate text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          {listing.flowerTypes.join(", ")}
        </p>
        <p className="mt-2 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          {formatListingPublishedAt(listing.publishedAt, listing.publishedAgo)}
        </p>
      </div>
    </article>
  );
}

function AuctionCardPriceAndTime({ listing }: { listing: ListingCardModel }) {
  const currentBid = listing.auctionCurrentBid ?? listing.price;
  const timeTone = getAuctionTimeTone(listing.auctionEndsAt);

  return (
    <>
      <strong className="block text-gf-body-l font-black leading-[normal] text-gf-text-primary">
        {formatPrice(currentBid)}
      </strong>
      <p
        className={cn("mt-1 truncate text-gf-body-l font-semibold leading-[normal]", {
          "text-gf-text-positive": timeTone === "positive",
          "text-gf-status-warning": timeTone === "warning",
          "text-gf-text-negative": timeTone === "negative",
        })}
      >
        {formatAuctionTimeLeft(listing.auctionEndsAt)}
      </p>
    </>
  );
}

function getFreshnessBadge(receivedAt: string | undefined, freshnessScore: number) {
  return {
    label: getCompactFreshnessLabel(receivedAt, freshnessScore),
    className: "",
  };
}
