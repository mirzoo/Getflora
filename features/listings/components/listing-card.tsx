"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { ListingPhoto } from "@/features/listings/components/listing-photo";
import { getFreshnessLabel, getFreshnessTone } from "@/features/listings/utils/freshness";
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
  const freshnessBadge = getFreshnessBadge(listing.receivedAt, listing.freshnessScore);

  return (
    <article className="group w-full">
      <div className="relative aspect-[29/27] w-full overflow-hidden rounded-[32px] bg-muted">
        <ListingPhoto
          src={images[activeImageIndex] ?? images[0]}
          alt={listing.imageAlt}
          width={520}
          height={520}
          className="size-full object-cover"
          priority={false}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />

        <div className="absolute inset-0 z-10 flex" onMouseLeave={() => setActiveImageIndex(0)}>
          {images.map((imageUrl, index) => (
            <button
              key={`${listing.id}-${imageUrl}`}
              className="h-full flex-1 cursor-pointer text-left"
              type="button"
              onMouseEnter={() => setActiveImageIndex(index)}
              onFocus={() => setActiveImageIndex(index)}
              onClick={() => onOpen(listing)}
              aria-label={`Открыть объявление, фото ${index + 1}`}
            />
          ))}
        </div>

        <span
          className={cn(
            "absolute right-5 top-5 z-20 inline-flex h-7 items-center rounded-full bg-white/80 px-2.5 text-gf-body-xs font-medium leading-[normal] text-gf-text-primary backdrop-blur-[16px]",
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
  const tone = getFreshnessTone(receivedAt, freshnessScore);
  const classNameByTone = {
    today: "bg-[#D1FDCF]/80 text-gf-text-positive",
    yesterday: "bg-[#E4FBDE]/80 text-gf-text-positive",
    "two-days": "bg-[#FEE9D1]/80 text-gf-status-warning",
    older: "bg-[#FEDCDC]/80 text-gf-text-negative",
  };

  return {
    label: getFreshnessLabel(receivedAt, freshnessScore),
    className: classNameByTone[tone],
  };
}
