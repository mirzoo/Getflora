"use client";

import { Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { shouldBypassNextImageOptimizer } from "@/lib/images";
import { cn } from "@/lib/utils";

type ListingImagePickerProps = {
  initialImageUrls?: string[];
  label?: string;
  className?: string;
  onFilesChange?: (files: File[]) => void;
};

type PendingImageFile = {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
};

const maxImages = 10;

export function ListingImagePicker({
  initialImageUrls = [],
  label = "Добавить фото",
  className,
  onFilesChange,
}: ListingImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFilesRef = useRef<PendingImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState(initialImageUrls.slice(0, maxImages));
  const [pendingFiles, setPendingFiles] = useState<PendingImageFile[]>([]);
  const totalImagesCount = existingImageUrls.length + pendingFiles.length;
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
      id: `${getImageFileKey(file)}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingFiles((current) => [...current, ...nextFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removePendingFile(id: string) {
    setPendingFiles((current) => {
      const removedFile = current.find((item) => item.id === id);

      if (removedFile) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-bold">{label}</span>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <div
          className={cn(
            "relative grid aspect-square w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/80 sm:w-36",
            canAddMore ? "cursor-pointer" : "pointer-events-none cursor-not-allowed opacity-50",
          )}
        >
          <Camera className="size-6" />
          <input
            ref={fileInputRef}
            className="absolute inset-0 cursor-pointer opacity-0"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!canAddMore}
            aria-label="Добавить фото"
            onChange={(event) => handleAddFiles(event.currentTarget.files)}
          />
        </div>

        {pendingFiles.map((item, index) => (
          <ImagePreview
            key={item.id}
            src={item.previewUrl}
            alt={item.name}
            isPrimary={index === 0}
            isLocalPreview
            onRemove={() => removePendingFile(item.id)}
          />
        ))}

        {existingImageUrls.map((imageUrl, index) => (
          <ImagePreview
            key={imageUrl}
            src={imageUrl}
            alt="Фото объявления"
            isPrimary={pendingFiles.length === 0 && index === 0}
            isLocalPreview={false}
            onRemove={() =>
              setExistingImageUrls((current) => current.filter((currentUrl) => currentUrl !== imageUrl))
            }
          />
        ))}
      </div>

      {existingImageUrls.map((imageUrl) => (
        <input key={imageUrl} name="imageUrls" type="hidden" value={imageUrl} />
      ))}

      <span className="text-xs text-muted-foreground">
        JPG, PNG или WebP, до 8 МБ на фото. Максимум 10 фото.
      </span>
    </div>
  );
}

function getImageFileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function ImagePreview({
  src,
  alt,
  isPrimary,
  isLocalPreview,
  onRemove,
}: {
  src: string;
  alt: string;
  isPrimary: boolean;
  isLocalPreview: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="group relative aspect-square w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-36">
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
      {isPrimary ? (
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-foreground/75 px-2 py-1 text-[10px] font-bold text-background">
          Главная
        </span>
      ) : null}
      <button
        className="absolute inset-0 grid place-items-center bg-primary/65 text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        type="button"
        onClick={onRemove}
        aria-label="Удалить фото"
      >
        <Trash2 className="size-6" />
      </button>
    </div>
  );
}
