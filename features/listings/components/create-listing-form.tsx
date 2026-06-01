"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createListingAction } from "@/features/listings/actions/create-listing";
import { ListingImagePicker } from "@/features/listings/components/listing-image-picker";
import { validateImageFileInput } from "@/features/listings/utils/client-image-files";
import type { ListingCardModel } from "@/types/listing";

type CreateListingFormProps = {
  city: string;
  sellerName?: string;
  sellerEmail?: string | null;
  onCreate: (listing: ListingCardModel) => void;
};

export function CreateListingForm({ city, sellerName, sellerEmail, onCreate }: CreateListingFormProps) {
  const [error, setError] = useState("");
  const [imagePickerKey, setImagePickerKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const imageError = validateImageFileInput(form);

    if (imageError) {
      setError(imageError);
      return;
    }

    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createListingAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onCreate(result.listing);
      form.reset();
      setImagePickerKey((current) => current + 1);
    });
  }

  return (
    <form
      className="grid gap-5 rounded-[24px] border border-border p-5"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-2xl font-bold">Новое объявление</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Добавьте до 10 фото. Объявление сразу сохраняется в PostgreSQL.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Ваше имя">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="sellerName"
            placeholder="Например, Алина"
            defaultValue={sellerName ?? ""}
            required
          />
        </Field>
        <Field label="Email для связи">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="sellerEmail"
            placeholder="you@example.com"
            type="email"
            defaultValue={sellerEmail ?? ""}
            required
          />
        </Field>
        <Field label="Название">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="title"
            placeholder="Букет из пионов и роз"
            required
          />
        </Field>
        <Field label="Цена, ₽">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="price"
            type="number"
            min="1"
            placeholder="2400"
            required
          />
        </Field>
        <Field label="Город">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="city"
            defaultValue={city}
            required
          />
        </Field>
        <Field label="Район или метро">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="area"
            placeholder="Центральный"
            required
          />
        </Field>
        <Field label="Количество цветов">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="flowersCount"
            type="number"
            min="1"
            placeholder="24"
          />
        </Field>
        <Field label="Свежесть, %">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="freshnessScore"
            type="number"
            min="1"
            max="100"
            defaultValue="90"
          />
        </Field>
        <Field className="lg:col-span-2" label="Состав через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="flowerTypes"
            placeholder="Розы, Пионы, Эвкалипт"
          />
        </Field>
        <Field className="lg:col-span-2" label="Цвета через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="colors"
            placeholder="pink, green, white"
          />
        </Field>
        <ListingImagePicker key={imagePickerKey} className="lg:col-span-2" />
        <Field label="Способ продажи">
          <select
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="type"
            defaultValue="sale"
          >
            <option value="sale">Продать сразу</option>
            <option value="auction">Аукцион</option>
          </select>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          className="min-h-28 rounded-xl bg-muted px-3 py-3 outline-none focus:ring-2 focus:ring-primary"
          name="description"
          placeholder="Расскажите немного о букете: когда подарили, почему продаете, как он хранился."
        />
      </Field>

      {error ? <p className="text-sm text-primary">{error}</p> : null}

      <Button className="w-fit" type="submit" disabled={isPending}>
        {isPending ? "Публикуем..." : "Опубликовать"}
      </Button>
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
