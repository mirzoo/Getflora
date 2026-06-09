"use client";

import { useState } from "react";
import { Clock, Heart } from "lucide-react";

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

  return (
    <article className="group">
      <div className="relative overflow-hidden rounded-[22px] bg-muted">
        <div
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
          onScroll={(event) => {
            const scrollLeft = event.currentTarget.scrollLeft;
            const itemWidth = event.currentTarget.clientWidth;
            setActiveImageIndex(Math.round(scrollLeft / itemWidth));
          }}
        >
          {images.map((imageUrl, index) => (
            <button
              key={`${listing.id}-${imageUrl}`}
              className="block min-w-full snap-center text-left"
              type="button"
              onClick={() => onOpen(listing)}
              aria-label={`Открыть объявление, фото ${index + 1}`}
            >
              <ListingPhoto
                src={imageUrl}
                alt={listing.imageAlt}
                width={520}
                height={520}
                className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                priority={false}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </button>
          ))}
        </div>

        {listing.type === "auction" ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
            <Clock className="size-3" />
            {listing.auctionEndsAt}
          </span>
        ) : null}

        {images.length > 1 ? (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {images.map((imageUrl, index) => (
              <span
                key={`${listing.id}-dot-${imageUrl}`}
                className={cn(
                  "size-1.5 rounded-full",
                  index === activeImageIndex ? "bg-white" : "bg-white/70",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative mt-3 space-y-1">
        {canToggleFavorite ? (
          <button
            className={cn(
              "absolute right-0 top-0 grid size-8 place-items-center rounded-full transition-colors",
              isFavorite ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
            type="button"
            aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
            onClick={() => onToggleFavorite(listing.id)}
          >
            <Heart className={cn("size-5", isFavorite && "fill-current")} />
          </button>
        ) : null}
        <strong className="block pr-10 text-lg leading-none">{formatPrice(listing.price)}</strong>
        <h2 className="pr-10 text-base leading-tight">{listing.title}</h2>
        <p className="text-sm text-muted-foreground">{listing.flowerTypes.join(", ")}</p>
        <p className="text-sm text-muted-foreground">
          {formatListingPublishedAt(listing.publishedAt, listing.publishedAgo)}
        </p>
      </div>
    </article>
  );
}
