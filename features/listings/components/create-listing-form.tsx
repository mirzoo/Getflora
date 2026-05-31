"use client";

import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { ListingCardModel, ListingType } from "@/types/listing";

type CreateListingFormProps = {
  city: string;
  onCreate: (listing: ListingCardModel) => void;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80";

export function CreateListingForm({ city, onCreate }: CreateListingFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const flowerTypes = String(formData.get("flowerTypes") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const type = String(formData.get("type")) as ListingType;
    const title = String(formData.get("title") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    const area = String(formData.get("area") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || fallbackImage;

    if (!title || !price || !area) {
      return;
    }

    onCreate({
      id: `local-${Date.now()}`,
      title,
      description: description || "Продавец пока не добавил описание.",
      price,
      type,
      status: "active",
      city,
      area,
      sellerName: "Вы",
      sellerId: "seller-you",
      publishedAgo: "только что",
      publishedAt: new Date().toISOString(),
      freshnessScore: 90,
      flowersCount: Number(formData.get("flowersCount") ?? 1),
      flowerTypes: flowerTypes.length ? flowerTypes : ["Розы"],
      colors: ["pink"],
      imageUrl,
      imageUrls: [imageUrl],
      imageAlt: title,
      auctionEndsAt: type === "auction" ? "Сегодня, 22:00" : undefined,
      bidsCount: type === "auction" ? 0 : undefined,
    });

    form.reset();
  }

  return (
    <form className="grid gap-3 rounded-[24px] border border-border p-4" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-xl font-bold">Разместить букет</h2>
        <p className="text-sm text-muted-foreground">
          Пока объявление добавляется только в текущую страницу.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input className="h-11 rounded-xl bg-muted px-3 outline-none" name="title" placeholder="Название" required />
        <input className="h-11 rounded-xl bg-muted px-3 outline-none" name="price" type="number" min="0" placeholder="Цена, ₽" required />
        <input className="h-11 rounded-xl bg-muted px-3 outline-none" name="area" placeholder="Район или метро" required />
        <input className="h-11 rounded-xl bg-muted px-3 outline-none" name="flowersCount" type="number" min="1" placeholder="Количество цветов" />
        <input className="h-11 rounded-xl bg-muted px-3 outline-none sm:col-span-2" name="flowerTypes" placeholder="Состав через запятую: Розы, Пионы" />
        <input className="h-11 rounded-xl bg-muted px-3 outline-none sm:col-span-2" name="imageUrl" type="url" placeholder="Ссылка на фото" />
        <select className="h-11 rounded-xl bg-muted px-3 outline-none" name="type" defaultValue="sale">
          <option value="sale">Продажа</option>
          <option value="auction">Аукцион</option>
        </select>
      </div>

      <textarea
        className="min-h-24 rounded-xl bg-muted px-3 py-3 outline-none"
        name="description"
        placeholder="Коротко о состоянии букета"
      />

      <Button type="submit">Опубликовать</Button>
    </form>
  );
}
