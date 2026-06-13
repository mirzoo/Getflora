"use client";

import Image from "next/image";
import Link from "next/link";

import heartStrokeIcon from "@/assets/icon/icn_m_heart-stroke.svg";
import messageDotsCircleIcon from "@/assets/icon/icn_m_message-dots-circle.svg";
import getfloraLogo from "@/assets/icon/logo-getflora.svg";
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
        className="flex items-center"
        href="/"
        onClick={onHomeClick}
        aria-label="Getflora"
      >
        <Image
          src={getfloraLogo}
          alt="Getflora"
          className="h-10 w-auto"
          priority
        />
      </Link>

      <nav className="flex items-center gap-2" aria-label="Основная навигация">
        {onFavoritesClick ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Избранные"
            onClick={onFavoritesClick}
          >
            <Image
              src={heartStrokeIcon}
              alt=""
              aria-hidden="true"
              className={cn("size-5", activeView === "favorites" && "opacity-100")}
            />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Избранные">
            <Link href="/?view=favorites">
              <Image src={heartStrokeIcon} alt="" aria-hidden="true" className="size-5" />
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
            <Image
              src={messageDotsCircleIcon}
              alt=""
              aria-hidden="true"
              className={cn("size-5", activeView === "messages" && "opacity-100")}
            />
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label="Сообщения">
            <Link href="/?view=messages">
              <Image src={messageDotsCircleIcon} alt="" aria-hidden="true" className="size-5" />
            </Link>
          </Button>
        )}

        {onSellClick ? (
          <Button className="hidden md:inline-flex" onClick={onSellClick}>
            Продать букет
          </Button>
        ) : (
          <Button asChild className="hidden md:inline-flex">
            <Link href="/?sell=1">
              Продать букет
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
