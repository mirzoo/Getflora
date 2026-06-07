"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateListingAction } from "@/features/listings/actions/update-listing";
import { ListingImagePicker } from "@/features/listings/components/listing-image-picker";
import { validateImageFiles } from "@/features/listings/utils/client-image-files";
import type { ListingCardModel } from "@/types/listing";

type EditListingFormProps = {
  listing: ListingCardModel;
  onCancel: () => void;
  onUpdate: (listing: ListingCardModel) => void;
};

export function EditListingForm({ listing, onCancel, onUpdate }: EditListingFormProps) {
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const imageError = validateImageFiles(imageFiles);

    if (imageError) {
      setError(imageError);
      return;
    }

    const formData = new FormData(event.currentTarget);
    imageFiles.forEach((file) => formData.append("imageFiles", file));

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
        }
      })();
    });
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохраняем..." : "Сохранить"}
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
