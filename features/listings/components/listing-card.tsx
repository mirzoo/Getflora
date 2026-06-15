"use client";

import { useRef, useState } from "react";
import { Clock } from "lucide-react";

import { ListingPhoto } from "@/features/listings/components/listing-photo";
import { getCompactFreshnessLabel } from "@/features/listings/utils/freshness";
import type { ListingCardModel } from "@/types/listing";
import { formatListingPublishedAt, formatPrice } from "@/lib/format";
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

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (images.length <= 1) {
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
    if (images.length <= 1 || !touchStartRef.current) {
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
        className="relative h-[190px] w-full touch-pan-y overflow-hidden rounded-[24px] bg-muted md:h-[270px] md:rounded-[32px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex size-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {images.map((imageUrl, index) => (
            <ListingPhoto
              key={`${listing.id}-slide-${imageUrl}`}
              src={imageUrl}
              alt={index === 0 ? listing.imageAlt : `${listing.imageAlt}, фото ${index + 1}`}
              width={520}
              height={520}
              className="size-full shrink-0 object-cover"
              priority={false}
              sizes="(min-width: 1440px) 290px, (min-width: 1024px) 290px, (min-width: 768px) calc((100vw - 104px) / 2), 50vw"
            />
          ))}
        </div>

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

        <span
          className={cn(
            "absolute right-3 top-3 z-20 inline-flex h-7 items-center rounded-full bg-white/80 px-2.5 text-gf-body-xs font-medium leading-[normal] text-gf-text-primary shadow-[4px_0_8px_rgba(0,0,0,0.10)] backdrop-blur-[32px] md:right-5 md:top-5",
            freshnessBadge.className,
          )}
        >
          {freshnessBadge.label}
        </span>

        {listing.type === "auction" ? (
          <span className="absolute left-5 top-5 z-20 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            <Clock className="size-3" />
            {listing.auctionEndsAt}
          </span>
        ) : null}

        {images.length > 1 ? (
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
        <strong className="block text-gf-body-l font-black leading-[normal] text-gf-text-primary">
          {formatPrice(listing.price)}
        </strong>
        <h2 className="mt-2 line-clamp-2 text-gf-body-l font-normal leading-[normal] text-gf-text-primary">
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

function getFreshnessBadge(receivedAt: string | undefined, freshnessScore: number) {
  return {
    label: getCompactFreshnessLabel(receivedAt, freshnessScore),
    className: "",
  };
}
