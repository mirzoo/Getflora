"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";

import { shouldBypassNextImageOptimizer } from "@/lib/images";
import { cn } from "@/lib/utils";

type ListingPhotoProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export function ListingPhoto({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
}: ListingPhotoProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "grid aspect-square w-full place-items-center bg-muted text-muted-foreground",
          className,
        )}
      >
        <div className="grid place-items-center gap-2 text-center text-sm">
          <ImageOff className="size-7" />
          <span>Фото недоступно</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={shouldBypassNextImageOptimizer(src)}
      onError={() => setHasError(true)}
    />
  );
}
