"use client";

import { Camera, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ListingImagePickerProps = {
  initialImageUrls?: string[];
  label?: string;
  className?: string;
};

type PendingImageFile = {
  id: string;
  inputId: string;
  key: string;
  name: string;
  previewUrl: string;
};

type ImageFileInput = {
  id: string;
  files: PendingImageFile[];
};

const maxImages = 10;

export function ListingImagePicker({
  initialImageUrls = [],
  label = "Добавить фото",
  className,
}: ListingImagePickerProps) {
  const pickerId = useId();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const pendingFilesRef = useRef<PendingImageFile[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState(initialImageUrls.slice(0, maxImages));
  const [fileInputs, setFileInputs] = useState<ImageFileInput[]>([
    createImageFileInput(pickerId, 0),
  ]);
  const pendingFiles = fileInputs.flatMap((input) => input.files);
  const totalImagesCount = existingImageUrls.length + pendingFiles.length;
  const canAddMore = totalImagesCount < maxImages;
  const activeInputId = fileInputs[fileInputs.length - 1]?.id;

  pendingFilesRef.current = pendingFiles;

  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  function handleAddFiles(inputId: string, files: FileList | null) {
    if (!files?.length) {
      return;
    }

    const availableSlots = maxImages - totalImagesCount;
    const nextFiles = Array.from(files).slice(0, availableSlots).map((file) => ({
      id: `${inputId}-${getImageFileKey(file)}`,
      inputId,
      key: getImageFileKey(file),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    }));

    setFileInputs((current) => [
      ...current.map((input) => (input.id === inputId ? { ...input, files: nextFiles } : input)),
      createImageFileInput(pickerId, current.length),
    ]);
  }

  function removePendingFile(id: string) {
    setFileInputs((current) => {
      const removedFile = current.flatMap((input) => input.files).find((item) => item.id === id);

      if (removedFile) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }

      return current.map((input) => ({
        ...input,
        files: input.files.filter((item) => item.id !== id),
      }));
    });
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <span className="text-sm font-bold">{label}</span>
      <div className="flex gap-3 overflow-x-auto pb-1">
        <button
          className="grid aspect-square w-28 shrink-0 place-items-center rounded-lg bg-muted text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-36"
          type="button"
          disabled={!canAddMore}
          onClick={() => activeInputId && fileInputRefs.current[activeInputId]?.click()}
          aria-label="Добавить фото"
        >
          <Camera className="size-6" />
        </button>

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

      {fileInputs.map((input) => (
        <input
          key={input.id}
          ref={(element) => {
            fileInputRefs.current[input.id] = element;
          }}
          className="sr-only"
          name="imageFiles"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={input.files.length === 0 && input.id !== activeInputId}
          onChange={(event) => handleAddFiles(input.id, event.currentTarget.files)}
        />
      ))}

      {pendingFiles.map((item) => (
        <input key={item.id} name="imageFileKeys" type="hidden" value={item.key} />
      ))}

      {existingImageUrls.map((imageUrl) => (
        <input key={imageUrl} name="imageUrls" type="hidden" value={imageUrl} />
      ))}

      <span className="text-xs text-muted-foreground">
        JPG, PNG или WebP, до 8 МБ на фото. Максимум 10 фото.
      </span>
    </div>
  );
}

function createImageFileInput(pickerId: string, index: number): ImageFileInput {
  return {
    id: `${pickerId}-image-files-${index}`,
    files: [],
  };
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
        <Image className="size-full object-cover" src={src} alt={alt} width={180} height={180} />
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
