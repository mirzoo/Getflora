"use client";

import type { FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createListingAction } from "@/features/listings/actions/create-listing";
import { ListingImagePicker } from "@/features/listings/components/listing-image-picker";
import { validateImageFiles } from "@/features/listings/utils/client-image-files";
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

    const form = event.currentTarget;
    const formData = new FormData(form);
    imageFiles.forEach((file) => formData.append("imageFiles", file));

    startTransition(() => {
      void (async () => {
        const clientSubmitStartedAt = Date.now();
        const totalBytes = imageFiles.reduce((sum, file) => sum + file.size, 0);
        // #region agent log
        fetch("http://127.0.0.1:7614/ingest/3b5aa120-25b0-4b47-a93d-bf686b79e3c0", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c13c82" },
          body: JSON.stringify({
            sessionId: "c13c82",
            runId: "pre-fix",
            hypothesisId: "A",
            location: "create-listing-form.tsx:submit-start",
            message: "Client submit started",
            data: {
              fileCount: imageFiles.length,
              totalBytes,
              fileSizes: imageFiles.map((file) => file.size),
              fileTypes: imageFiles.map((file) => file.type),
            },
            timestamp: clientSubmitStartedAt,
          }),
        }).catch(() => {});
        // #endregion
        try {
          const result = await createListingAction(formData);
          const clientSubmitDurationMs = Date.now() - clientSubmitStartedAt;
          // #region agent log
          fetch("http://127.0.0.1:7614/ingest/3b5aa120-25b0-4b47-a93d-bf686b79e3c0", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "c13c82" },
            body: JSON.stringify({
              sessionId: "c13c82",
              runId: "pre-fix",
              hypothesisId: "D",
              location: "create-listing-form.tsx:submit-end",
              message: "Client submit finished",
              data: { ok: result.ok, durationMs: clientSubmitDurationMs },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          if (!result.ok) {
            setError(result.error);
            return;
          }

          onCreate(result.listing);
          form.reset();
          setImageFiles([]);
          setImagePickerKey((current) => current + 1);
        } catch (submitError) {
          console.error("Failed to publish listing", submitError);
          setError(
            submitError instanceof Error
              ? submitError.message
              : "Не удалось опубликовать объявление. Попробуйте ещё раз.",
          );
        }
      })();
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

      <div className="grid gap-3 md:grid-cols-2">
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
        <Field className="md:col-span-2" label="Состав через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="flowerTypes"
            placeholder="Розы, Пионы, Эвкалипт"
          />
        </Field>
        <Field className="md:col-span-2" label="Цвета через запятую">
          <input
            className="h-11 rounded-xl bg-muted px-3 outline-none focus:ring-2 focus:ring-primary"
            name="colors"
            placeholder="pink, green, white"
          />
        </Field>
        <ListingImagePicker
          key={imagePickerKey}
          className="md:col-span-2"
          onFilesChange={setImageFiles}
        />
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
