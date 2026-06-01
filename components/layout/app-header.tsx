"use client";

import Link from "next/link";
import { Heart, MessageCircle, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  activeView?: "marketplace" | "messages" | "favorites" | "sell" | "my-listings";
  authLabel?: string;
  onHomeClick?: () => void;
  onFavoritesClick?: () => void;
  onMessagesClick?: () => void;
  onSellClick?: () => void;
  onAuthClick?: () => void;
  authHref?: string;
};

export function AppHeader({
  activeView,
  authLabel = "Войти",
  onHomeClick,
  onFavoritesClick,
  onMessagesClick,
  onSellClick,
  onAuthClick,
  authHref = "/?auth=1",
}: AppHeaderProps) {
  return (
    <header className="mb-8 flex min-h-10 items-center justify-between gap-4">
      <Link
        className="flex items-center gap-2 text-sm font-bold"
        href="/"
        onClick={onHomeClick}
      >
        <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
          R
        </span>
        ReBloom
      </Link>

      <nav className="flex items-center gap-2" aria-label="Основная навигация">
        {onFavoritesClick ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Избранные"
            onClick={onFavoritesClick}
          >
            <Heart
              className={cn(
                "size-4",
                activeView === "favorites" && "fill-current text-primary",
              )}
            />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Избранные">
            <Link href="/?view=favorites">
              <Heart className="size-4" />
            </Link>
          </Button>
        )}

        {onMessagesClick ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Сообщения"
            onClick={onMessagesClick}
          >
            <MessageCircle
              className={cn("size-4", activeView === "messages" && "text-primary")}
            />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Сообщения">
            <Link href="/?view=messages">
              <MessageCircle className="size-4" />
            </Link>
          </Button>
        )}

        {onSellClick ? (
          <Button className="hidden lg:inline-flex" onClick={onSellClick}>
            <ShoppingBag className="size-4" />
            Продать за 0 ₽
          </Button>
        ) : (
          <Button asChild className="hidden lg:inline-flex">
            <Link href="/?sell=1">
              <ShoppingBag className="size-4" />
              Продать за 0 ₽
            </Link>
          </Button>
        )}

        {onAuthClick ? (
          <Button variant="secondary" onClick={onAuthClick}>
            {authLabel}
          </Button>
        ) : (
          <Button asChild variant="secondary">
            <Link href={authHref}>{authLabel}</Link>
          </Button>
        )}
      </nav>
    </header>
  );
}
