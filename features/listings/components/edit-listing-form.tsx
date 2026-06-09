"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateListingAction } from "@/features/listings/actions/update-listing";
import {
  maxFlowersCount,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import { ListingImagePicker } from "@/features/listings/components/listing-image-picker";
import { validateImageFiles } from "@/features/listings/utils/client-image-files";
import { compressImageFilesForUpload } from "@/features/listings/utils/compress-client-images";
import { uploadImagesDirectly } from "@/features/listings/utils/direct-image-upload";
import type { ListingCardModel } from "@/types/listing";

type EditListingFormProps = {
  listing: ListingCardModel;
  onCancel: () => void;
  onUpdate: (listing: ListingCardModel) => void;
};

export function EditListingForm({ listing, onCancel, onUpdate }: EditListingFormProps) {
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const imageError = validateImageFiles(imageFiles);

    if (imageError) {
      setError(imageError);
      return;
    }

    const form = event.currentTarget;

    void (async () => {
      setIsSubmitting(true);

      let filesToUpload = imageFiles;

      try {
        if (imageFiles.length) {
          try {
            const compression = await compressImageFilesForUpload(imageFiles);
            filesToUpload = compression.files;
          } catch (compressionError) {
            console.error("Failed to compress listing images", compressionError);
            setError("Не удалось подготовить фото. Попробуйте выбрать другие снимки.");
            return;
          }

          const compressedValidationError = validateImageFiles(filesToUpload);

          if (compressedValidationError) {
            setError(compressedValidationError);
            return;
          }
        }

        const formData = new FormData(form);

        if (filesToUpload.length) {
          const uploadedImageUrls = await uploadImagesDirectly(filesToUpload);
          uploadedImageUrls.forEach((imageUrl) => formData.append("imageUrls", imageUrl));
        }

        await new Promise<void>((resolve) => {
          startTransition(() => {
            void (async () => {
              try {
                const result = await updateListingAction(formData);

                if (!result.ok) {
                  setError(result.error);
                  return;
                }

                onUpdate(result.listing);
              } catch (submitError) {
                console.error("Failed to update listing", submitError);
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : "Не удалось сохранить изменения. Попробуйте ещё раз.",
                );
              } finally {
                resolve();
              }
            })();
          });
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <form className="grid gap-5" encType="multipart/form-data" onSubmit={handleSubmit}>
      <input name="listingId" type="hidden" value={listing.id} />

      <div>
        <h2 className="text-2xl font-bold">Редактировать объявление</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Изменения не продлевают срок жизни объявления и не поднимают его в ленте.
        </p>
      </div>

      <div className="rounded-2xl bg-muted p-4">
        <p className="text-xs text-muted-foreground">Название</p>
        <strong>{listing.title}</strong>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Цена, ₽">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="price"
            type="number"
            min="1"
            max={maxListingPrice}
            defaultValue={listing.price}
            required
          />
        </Field>
        <Field label="Район или метро">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="area"
            defaultValue={listing.area}
            required
          />
        </Field>
        <Field label="Количество цветов">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="flowersCount"
            type="number"
            min="1"
            max={maxFlowersCount}
            defaultValue={listing.flowersCount}
          />
        </Field>
        <Field label="Цвета через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="colors"
            defaultValue={listing.colors.join(", ")}
            placeholder="pink, green, white"
          />
        </Field>
        <Field className="md:col-span-2" label="Состав через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="flowerTypes"
            defaultValue={listing.flowerTypes.join(", ")}
          />
        </Field>
        <ListingImagePicker
          className="md:col-span-2"
          initialImageUrls={listing.imageUrls ?? [listing.imageUrl]}
          onFilesChange={setImageFiles}
        />
      </div>

      <Field label="Описание">
        <textarea
          className="min-h-28 rounded-xl bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-primary"
          name="description"
          defaultValue={listing.description}
        />
      </Field>

      {error ? <p className="text-sm text-primary">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Сохраняем..." : "Сохранить"}
        </Button>
        <Button variant="secondary" type="button" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className ? `grid gap-1.5 ${className}` : "grid gap-1.5"}>
      <span className="text-sm font-bold">{label}</span>
      {children}
    </label>
  );
}
