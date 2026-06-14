"use client";

import { Camera } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { MenuPopover, MenuPopoverOption } from "@/components/ui/menu-popover";
import { shouldBypassNextImageOptimizer } from "@/lib/images";
import { cn } from "@/lib/utils";
import { maxImageFiles } from "@/features/listings/constants/listing-limits";

type ListingImagePickerProps = {
  initialImageUrls?: string[];
  label?: string | null;
  className?: string;
  listClassName?: string;
  showHint?: boolean;
  tileClassName?: string;
  onFilesChange?: (files: File[]) => void;
};

type PendingImageFile = {
  type: "pending";
  id: string;
  file: File;
  name: string;
  previewUrl: string;
};

type ExistingImageFile = {
  type: "existing";
  id: string;
  url: string;
};

type PickerImageItem = PendingImageFile | ExistingImageFile;

const maxImages = maxImageFiles;

export function ListingImagePicker({
  initialImageUrls = [],
  label = "Добавить фото",
  className,
  listClassName,
  showHint = true,
  tileClassName,
  onFilesChange,
}: ListingImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<PendingImageFile[]>([]);
  const [items, setItems] = useState<PickerImageItem[]>(() =>
    initialImageUrls.slice(0, maxImages).map((url) => ({
      type: "existing",
      id: `existing-${url}`,
      url,
    })),
  );
  const pendingFiles = useMemo(() => items.filter(isPendingImageFile), [items]);
  const existingImages = useMemo(() => items.filter(isExistingImageFile), [items]);
  const totalImagesCount = items.length;
  const canAddMore = totalImagesCount < maxImages;

  pendingFilesRef.current = pendingFiles;

  useEffect(() => {
    onFilesChange?.(pendingFiles.map((item) => item.file));
  }, [onFilesChange, pendingFiles]);

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function handleAddFiles(files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const availableSlots = maxImages - totalImagesCount;
    const nextFiles = Array.from(files).slice(0, availableSlots).map((file) => ({
      type: "pending" as const,
      id: `${getImageFileKey(file)}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setItems((current) => [...current, ...nextFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeImage(imageId: string) {
    setItems((current) => {
      const imageToRemove = current.find((item) => item.id === imageId);

      if (imageToRemove?.type === "pending") {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return current.filter((item) => item.id !== imageId);
    });
  }

  function makePrimaryImage(imageId: string) {
    setItems((current) => {
      const imageToMove = current.find((item) => item.id === imageId);

      if (!imageToMove) {
        return current;
      }

      return [imageToMove, ...current.filter((item) => item.id !== imageId)];
    });
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {label ? <span className="text-sm font-bold">{label}</span> : null}
      <div className={cn("flex gap-3 overflow-x-auto pb-1", listClassName)}>
        {items.map((item, index) => (
          <ImagePreview
            key={item.id}
            src={item.type === "pending" ? item.previewUrl : item.url}
            alt={item.type === "pending" ? item.name : "Фото объявления"}
            isLocalPreview={item.type === "pending"}
            isPrimary={index === 0}
            onMakePrimary={() => makePrimaryImage(item.id)}
            onRemove={() => removeImage(item.id)}
            className={tileClassName}
          />
        ))}

        {canAddMore ? (
          <div
            className={cn(
              "relative grid aspect-square w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/80 sm:w-36",
              "cursor-pointer",
              tileClassName,
            )}
          >
            <Camera className="size-6" />
            <input
              ref={fileInputRef}
              className="absolute inset-0 cursor-pointer opacity-0"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="Добавить фото"
              onChange={(event) => handleAddFiles(event.currentTarget.files)}
            />
          </div>
        ) : null}
      </div>

      {existingImages.map((image) => (
        <input key={image.id} name="imageUrls" type="hidden" value={image.url} />
      ))}

      {items.map((item) => (
        <input
          key={`order-${item.id}`}
          name="imageOrder"
          type="hidden"
          value={item.type === "existing" ? `existing:${item.url}` : `pending:${item.id}`}
        />
      ))}

      {showHint ? (
        <span className="text-xs text-muted-foreground">
          JPG, PNG или WebP, до 8 МБ на фото и 24 МБ суммарно. Максимум {maxImageFiles} фото.
        </span>
      ) : null}
    </div>
  );
}

function getImageFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function isPendingImageFile(item: PickerImageItem): item is PendingImageFile {
  return item.type === "pending";
}

function isExistingImageFile(item: PickerImageItem): item is ExistingImageFile {
  return item.type === "existing";
}

function ImagePreview({
  src,
  alt,
  isLocalPreview,
  isPrimary,
  onMakePrimary,
  onRemove,
  className,
}: {
  src: string;
  alt: string;
  isLocalPreview: boolean;
  isPrimary: boolean;
  onMakePrimary: () => void;
  onRemove: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative aspect-square w-28 shrink-0 overflow-visible rounded-lg bg-muted sm:w-36",
        className,
      )}
    >
      <div className="size-full overflow-hidden rounded-lg">
        {isLocalPreview ? (
          <>
            {/* Plain img supports local object URLs used for unsaved previews. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-full object-cover" src={src} alt={alt} />
          </>
        ) : (
          <Image
            className="size-full object-cover"
            src={src}
            alt={alt}
            width={180}
            height={180}
            unoptimized={shouldBypassNextImageOptimizer(src)}
          />
        )}
      </div>

      {isPrimary ? (
        <span className="absolute left-2 top-2 rounded-full bg-gf-bg-base px-2 py-1 text-gf-body-xs font-medium leading-[normal] text-gf-text-primary shadow-[0_2px_8px_rgb(0_0_0/0.12)]">
          Главное
        </span>
      ) : null}

      <span
        className="pointer-events-none absolute left-0 top-full z-10 h-4 w-[232px] group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
        aria-hidden="true"
      />
      <MenuPopover className="pointer-events-none left-0 top-[calc(100%+4px)] z-20 w-[232px] translate-x-0 translate-y-1 p-0 opacity-0 shadow-[0_4px_12px_rgb(0_0_0/0.18)] transition duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {!isPrimary ? (
          <MenuPopoverOption
            className="h-14 whitespace-nowrap py-0"
            onClick={onMakePrimary}
          >
            Сделать главным
          </MenuPopoverOption>
        ) : null}
        <MenuPopoverOption
          className="h-14 whitespace-nowrap py-0 text-gf-text-negative"
          onClick={onRemove}
        >
          Удалить
        </MenuPopoverOption>
      </MenuPopover>
    </div>
  );
}
