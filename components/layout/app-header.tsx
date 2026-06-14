"use client";

import Image from "next/image";
import Link from "next/link";

import markerPinIcon from "@/assets/icon/icn_m_marker-pin-02.svg";
import messageDotsCircleIcon from "@/assets/icon/icn_m_message-dots-circle.svg";
import userIcon from "@/assets/icon/icn_m_user-02.svg";
import getfloraLogo from "@/assets/icon/logo-getflora.svg";
import { Button } from "@/components/ui/button";
import { ButtonBox } from "@/components/ui/button-box";

type AppHeaderProps = {
  activeView?: "marketplace" | "messages" | "sell" | "my-listings" | "account";
  authLabel?: string;
  authUser?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  selectedCity?: string;
  leftLabel?: string;
  leftHref?: string;
  showLeftIcon?: boolean;
  onHomeClick?: () => void;
  onMessagesClick?: () => void;
  onSellClick?: () => void;
  onAuthClick?: () => void;
  onCityClick?: () => void;
  authHref?: string;
};

export function AppHeader({
  authLabel = "Войти",
  authUser = null,
  selectedCity = "Москва",
  leftLabel = selectedCity,
  leftHref,
  showLeftIcon = true,
  onHomeClick,
  onMessagesClick,
  onSellClick,
  onAuthClick,
  onCityClick,
  authHref = "/?auth=1",
}: AppHeaderProps) {
  return (
    <header className="mb-4 flex min-h-12 items-center justify-between gap-4 xl:w-[1232px]">
      <Link
        className="flex h-10 w-auto shrink-0 items-center"
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
        {leftHref ? (
          <ButtonBox
            asChild
            className="h-12 gap-1 rounded-2xl px-4 text-gf-body-s font-medium"
            variant="float"
            width="auto"
            aria-label={leftLabel}
          >
            <Link href={leftHref}>
              {showLeftIcon ? (
                <Image src={markerPinIcon} alt="" aria-hidden="true" className="size-5" />
              ) : null}
              {leftLabel}
            </Link>
          </ButtonBox>
        ) : (
          <ButtonBox
            className="h-12 gap-1 rounded-2xl px-4 text-gf-body-s font-medium"
            variant="float"
            width="auto"
            onClick={onCityClick}
            aria-label="Выбрать город"
          >
            {showLeftIcon ? (
              <Image src={markerPinIcon} alt="" aria-hidden="true" className="size-5" />
            ) : null}
            {leftLabel}
          </ButtonBox>
        )}

        {onMessagesClick ? (
          <ButtonBox
            className="hidden h-12 gap-1 rounded-2xl px-4 text-gf-body-s font-medium md:inline-flex"
            variant="float"
            width="auto"
            onClick={onMessagesClick}
            aria-label="Чат"
          >
            <Image src={messageDotsCircleIcon} alt="" aria-hidden="true" className="size-5" />
            Чат
          </ButtonBox>
        ) : null}

        {onSellClick ? (
          <Button className="hidden h-12 rounded-2xl px-4 text-gf-body-s font-medium text-gf-text-on-accent md:inline-flex" onClick={onSellClick}>
            Продать букет
          </Button>
        ) : (
          <Button asChild className="hidden h-12 rounded-2xl px-4 text-gf-body-s font-medium text-gf-text-on-accent md:inline-flex">
            <Link href="/?sell=1">
              Продать букет
            </Link>
          </Button>
        )}

        {authUser && onAuthClick ? (
          <Button
            className="size-12 overflow-hidden rounded-full bg-gf-bg-alt p-0 text-gf-body-m font-medium leading-[normal] text-gf-text-primary hover:bg-[#f2f2f2]"
            variant="ghost"
            size="icon"
            aria-label="Аккаунт"
            onClick={onAuthClick}
          >
            <UserAvatar user={authUser} />
          </Button>
        ) : onAuthClick ? (
          <Button variant="ghost" size="icon" onClick={onAuthClick} aria-label={authLabel}>
            <Image src={userIcon} alt="" aria-hidden="true" className="size-5" />
          </Button>
        ) : authUser ? (
          <Button
            asChild
            className="size-12 overflow-hidden rounded-full bg-gf-bg-alt p-0 text-gf-body-m font-medium leading-[normal] text-gf-text-primary hover:bg-[#f2f2f2]"
            variant="ghost"
            size="icon"
            aria-label="Аккаунт"
          >
            <Link href="/?account=1">
              <UserAvatar user={authUser} />
            </Link>
          </Button>
        ) : (
          <Button asChild variant="ghost" size="icon" aria-label={authLabel}>
            <Link href={authHref}>
              <Image src={userIcon} alt="" aria-hidden="true" className="size-5" />
            </Link>
          </Button>
        )}
      </nav>
    </header>
  );
}

function UserAvatar({
  user,
}: {
  user: NonNullable<AppHeaderProps["authUser"]>;
}) {
  if (user.avatarUrl) {
    return (
      // User avatars can come from storage/CDN URLs outside Next image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        aria-hidden="true"
        className="size-full object-cover"
      />
    );
  }

  const initial = getUserInitial(user);

  return (
    <span className="inline-flex size-full items-center justify-center text-gf-body-m font-medium leading-[normal] text-gf-text-primary">
      {initial}
    </span>
  );
}

function getUserInitial(user: NonNullable<AppHeaderProps["authUser"]>) {
  const source = user.email?.trim() || user.name?.trim() || "?";

  return source.charAt(0).toUpperCase();
}
