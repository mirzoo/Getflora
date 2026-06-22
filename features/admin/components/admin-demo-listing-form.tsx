"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cities, defaultCityName } from "@/features/cities/data/cities";
import { createDemoListingAction } from "@/features/admin/actions/create-demo-listing";
import {
  maxFlowersCount,
  maxImageFiles,
  maxListingPrice,
} from "@/features/listings/constants/listing-limits";
import { validateImageFiles } from "@/features/listings/utils/client-image-files";

const colorOptions = [
  { value: "pink", label: "Розовый" },
  { value: "red", label: "Красный" },
  { value: "white", label: "Белый" },
  { value: "purple", label: "Фиолетовый" },
  { value: "orange", label: "Оранжевый" },
  { value: "green", label: "Зелёный" },
  { value: "blue", label: "Синий" },
  { value: "cyan", label: "Голубой" },
  { value: "black", label: "Тёмный" },
];

const freshnessOptions = [
  { label: "Сегодня", value: "0", score: 95 },
  { label: "Вчера", value: "1", score: 85 },
  { label: "2 дня назад", value: "2", score: 70 },
  { label: "3 дня назад", value: "3", score: 55 },
  { label: "5 дней назад", value: "5", score: 40 },
];

const inputClassName =
  "h-11 rounded-[6px] border border-gf-border bg-gf-bg-base px-4 text-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2";
const textareaClassName =
  "min-h-32 rounded-[6px] border border-gf-border bg-gf-bg-base px-4 py-3 text-sm outline-none ring-primary/30 transition placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2";

export function AdminDemoListingForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState("Анна");
  const [sellerSlug, setSellerSlug] = useState("anna");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [flowersCount, setFlowersCount] = useState("");
  const [selectedFreshness, setSelectedFreshness] = useState(freshnessOptions[0]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();

  const imageFileLabel = useMemo(() => {
    if (!imageFiles.length) {
      return `До ${maxImageFiles} фото`;
    }

    return imageFiles.map((file) => file.name).join(", ");
  }, [imageFiles]);

  function handleSellerNameChange(value: string) {
    setSellerName(value);

    if (!sellerSlug.trim()) {
      setSellerSlug(toSellerSlug(value));
    }
  }

  function handleFilesChange(files: FileList | null) {
    const nextFiles = Array.from(files ?? []);
    const imageError = validateImageFiles(nextFiles);

    if (imageError) {
      setError(imageError);
      setImageFiles([]);
      return;
    }

    setError(null);
    setImageFiles(nextFiles);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const imageError = validateImageFiles(imageFiles);

    if (imageError) {
      setError(imageError);
      return;
    }

    if (!imageFiles.length) {
      setError("Загрузите хотя бы одно фото букета.");
      return;
    }

    if (!title.trim() || !price || Number(price) <= 0) {
      setError("Добавьте название и цену.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    formData.set("sellerName", sellerName);
    formData.set("sellerSlug", sellerSlug);
    formData.set("freshnessScore", String(selectedFreshness.score));
    formData.set("receivedDaysAgo", selectedFreshness.value);

    setError(null);

    startTransition(async () => {
      const result = await createDemoListingAction(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/admin/listings/${result.listingId}`);
      router.refresh();
    });
  }

  return (
    <form className="grid gap-6" encType="multipart/form-data" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Витринный продавец">
          <input
            className={inputClassName}
            name="sellerName"
            value={sellerName}
            onChange={(event) => handleSellerNameChange(event.target.value)}
            placeholder="Анна"
            maxLength={80}
            required
          />
        </Field>
        <Field label="Slug продавца">
          <input
            className={inputClassName}
            name="sellerSlug"
            value={sellerSlug}
            onChange={(event) => setSellerSlug(toSellerSlug(event.target.value))}
            placeholder="anna"
            maxLength={40}
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Field label="Название букета">
          <input
            className={inputClassName}
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Нежные пионы в крафте"
            maxLength={120}
            required
          />
        </Field>
        <Field label="Статус">
          <select className={inputClassName} name="status" defaultValue="active">
            <option value="active">Активный</option>
            <option value="sold">Проданный</option>
          </select>
        </Field>
      </div>

      <Field label="Описание">
        <textarea
          className={textareaClassName}
          name="description"
          placeholder="Опишите состав, состояние и повод. Текст увидят покупатели."
          maxLength={1000}
        />
      </Field>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Цена">
          <input
            className={inputClassName}
            inputMode="numeric"
            name="price"
            value={price}
            onChange={(event) => setPrice(toDigits(event.target.value).slice(0, 7))}
            placeholder="4500"
            max={maxListingPrice}
            required
          />
        </Field>
        <Field label="Город">
          <select className={inputClassName} name="city" defaultValue={defaultCityName}>
            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Район">
          <input className={inputClassName} name="area" placeholder="Центр" maxLength={80} />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Свежесть">
          <select
            className={inputClassName}
            value={selectedFreshness.value}
            onChange={(event) => {
              setSelectedFreshness(
                freshnessOptions.find((option) => option.value === event.target.value) ?? freshnessOptions[0],
              );
            }}
          >
            {freshnessOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Цветы">
          <input className={inputClassName} name="flowerTypes" defaultValue="Розы" maxLength={240} />
        </Field>
        <Field label="Количество">
          <input
            className={inputClassName}
            inputMode="numeric"
            name="flowersCount"
            value={flowersCount}
            onChange={(event) => setFlowersCount(toDigits(event.target.value).slice(0, 4))}
            placeholder="15"
            max={maxFlowersCount}
          />
        </Field>
      </div>

      <Field label="Цветовая палитра">
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => (
            <label
              key={color.value}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[6px] border border-gf-border bg-gf-bg-alt px-3 text-sm"
            >
              <input
                name="colors"
                type="checkbox"
                value={color.value}
                defaultChecked={color.value === "pink"}
              />
              {color.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Фото букета">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[8px] border border-dashed border-gf-border bg-gf-bg-alt px-4 py-6 text-center transition hover:border-gf-border-hover">
          <span className="font-medium text-gf-text-primary">Выбрать фото</span>
          <span className="mt-2 max-w-xl text-sm leading-5 text-muted-foreground">{imageFileLabel}</span>
          <input
            className="sr-only"
            name="imageFiles"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => handleFilesChange(event.target.files)}
          />
        </label>
      </Field>

      {error ? (
        <p className="rounded-[8px] border border-gf-status-negative-pale-hover bg-gf-status-negative-pale px-4 py-3 text-sm text-gf-status-negative">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} className="rounded-[6px]">
          {isPending ? "Публикуем..." : "Опубликовать витринный букет"}
        </Button>
        <Button type="button" variant="outline" className="rounded-[6px]" onClick={() => router.push("/admin/listings")}>
          Отмена
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-gf-text-primary">{label}</span>
      {children}
    </label>
  );
}

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toSellerSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "e")
    .replace(/[а-я]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
