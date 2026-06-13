"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { ListingPhoto } from "@/features/listings/components/listing-photo";
import type { ListingCardModel } from "@/types/listing";
import { formatListingPublishedAt, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardModel;
  isFavorite: boolean;
  canToggleFavorite?: boolean;
  onOpen: (listing: ListingCardModel) => void;
  onToggleFavorite: (listingId: string) => void;
};

export function ListingCard({
  listing,
  isFavorite,
  canToggleFavorite = true,
  onOpen,
  onToggleFavorite,
}: ListingCardProps) {
  const images = listing.imageUrls?.length ? listing.imageUrls : [listing.imageUrl];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const freshnessBadge = getFreshnessBadge(listing.freshnessScore);

  return (
    <article className="group">
      <div className="relative h-[270px] w-[250px] overflow-hidden rounded-[32px] bg-muted">
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
            "absolute left-4 top-4 z-20 inline-flex h-7 items-center rounded-full px-2.5 text-gf-body-xs font-medium leading-[normal] backdrop-blur-[32px]",
            freshnessBadge.className,
          )}
        >
          {freshnessBadge.label}
        </span>

        {canToggleFavorite ? (
          <button
            className={cn(
              "absolute right-4 top-4 z-20 grid size-7 place-items-center text-white/80 drop-shadow-[0_4px_8px_rgb(0_0_0/0.10)] transition-colors hover:text-white",
              isFavorite && "text-gf-status-negative",
            )}
            type="button"
            aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            onClick={() => onToggleFavorite(listing.id)}
          >
            <HeartRoundedIcon className="size-7" />
          </button>
        ) : null}

        {listing.type === "auction" ? (
          <span className="absolute left-4 top-14 z-20 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
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
        <h2 className="mt-2 text-gf-body-l font-normal leading-[normal] text-gf-text-primary">
          {listing.title}
        </h2>
        <p className="mt-1 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          {listing.flowerTypes.join(", ")}
        </p>
        <p className="mt-2 text-gf-body-m font-normal leading-[normal] text-gf-text-secondary">
          {formatListingPublishedAt(listing.publishedAt, listing.publishedAgo)}
        </p>
      </div>
    </article>
  );
}

function getFreshnessBadge(freshnessScore: number) {
  if (freshnessScore >= 90) {
    return {
      label: "Как новый",
      className: "bg-[#D1FDCF]/80 text-gf-text-positive",
    };
  }

  if (freshnessScore >= 80) {
    return {
      label: "Очень свежий",
      className: "bg-[#E4FBDE]/80 text-gf-text-positive",
    };
  }

  if (freshnessScore >= 70) {
    return {
      label: "Свежий",
      className: "bg-[#FEE9D1]/80 text-gf-status-warning",
    };
  }

  return {
    label: "Последние дни",
    className: "bg-[#FEDCDC]/80 text-gf-text-negative",
  };
}

function HeartRoundedIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 28 28"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M18.7959 2.5C23.6139 2.5 26.6658 7.02954 26.666 11.0596C26.666 13.1688 25.8493 15.1252 24.7031 16.834C23.5561 18.5439 22.0433 20.0616 20.5557 21.3154C19.0644 22.5723 17.5702 23.5877 16.4365 24.2891C15.8691 24.6401 15.3866 24.9158 15.0352 25.1055C14.8606 25.1997 14.7132 25.2756 14.6006 25.3301C14.5458 25.3566 14.49 25.383 14.4395 25.4043C14.4153 25.4144 14.379 25.4287 14.3389 25.4424C14.3191 25.4491 14.2861 25.4598 14.2461 25.4697C14.2209 25.476 14.1244 25.5 14 25.5C13.875 25.5 13.7776 25.4758 13.7529 25.4697C13.7128 25.4598 13.6799 25.4491 13.6602 25.4424C13.6201 25.4288 13.5846 25.4144 13.5605 25.4043C13.51 25.383 13.4543 25.3566 13.3994 25.3301C13.2867 25.2756 13.1387 25.1998 12.9639 25.1055C12.6125 24.9157 12.1309 24.6401 11.5635 24.2891C10.4298 23.5876 8.9358 22.5724 7.44434 21.3154C5.95659 20.0615 4.44299 18.544 3.2959 16.834C2.14979 15.1252 1.33301 13.1687 1.33301 11.0596C1.33322 7.02968 4.3854 2.50031 9.20312 2.5C11.3584 2.5 12.9301 3.36766 13.999 4.31934C15.0679 3.36741 16.6402 2.50009 18.7959 2.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
