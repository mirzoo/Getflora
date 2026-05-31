import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { mockListings } from "@/features/listings/data/mock-listings";

type MessagesPageProps = {
  params: Promise<{
    listingId: string;
  }>;
  searchParams: Promise<{
    seller?: string;
  }>;
};

export default async function MessagesPage({ params, searchParams }: MessagesPageProps) {
  const { listingId } = await params;
  const { seller } = await searchParams;
  const listing = mockListings.find((item) => item.id === listingId);

  return (
    <AppFrame>
      <AppHeader activeView="messages" />

      <section className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col">
          <div className="mb-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/?view=messages">
                <ArrowLeft className="size-4" />
                Сообщения
              </Link>
            </Button>
          </div>

          <div className="flex min-h-[560px] flex-1 flex-col rounded-[24px] border border-border">
            <div className="border-b border-border p-5">
              <p className="text-sm text-muted-foreground">Чат с продавцом</p>
              <h1 className="mt-1 text-2xl font-bold">
                {listing?.sellerName ?? seller ?? "Продавец"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {listing ? listing.title : "Объявление пока доступно только как демо-чат."}
              </p>
            </div>

            <div className="flex flex-1 flex-col justify-end gap-3 p-5">
              <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-3">
                Здравствуйте! Букет еще доступен?
              </div>
              <div className="ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground">
                Да, можно забрать сегодня.
              </div>
            </div>

            <form className="flex gap-2 border-t border-border p-4">
              <input
                className="h-11 min-w-0 flex-1 rounded-full bg-muted px-4 outline-none focus:ring-2 focus:ring-primary"
                placeholder="Написать сообщение"
              />
              <Button type="button">
                <MessageCircle className="size-4" />
                <span className="hidden sm:inline">Отправить</span>
              </Button>
            </form>
          </div>
        </div>

        <aside className="hidden lg:block" aria-hidden="true" />
      </section>
    </AppFrame>
  );
}
