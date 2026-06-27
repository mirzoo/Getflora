import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import getfloraBigLogo from "@/assets/icon/logo-getflora-big.svg";
import telegramIcon from "@/assets/icon/telegram.svg";
import { cn } from "@/lib/utils";

const footerColumns = [
  {
    title: "Города",
    links: [
      { label: "Москва" },
      { label: "Санкт-Петербург" },
      { label: "Казань" },
      { label: "Екатеринбург" },
      { label: "Сочи" },
    ],
  },
  {
    title: "О нас",
    links: [
      { label: "Что делаем", href: "/about" },
      { label: "Что нового", href: "/updates" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Помощь",
    links: [
      { label: "Как покупать", href: "/buy" },
      { label: "Как продавать", href: "/sell" },
      { label: "Как делать ставки", href: "/how-bids-work" },
    ],
  },
  {
    title: "Документы",
    links: [
      { label: "Оферта", href: "/offer" },
      { label: "Условия", href: "/terms" },
      { label: "Конфиденциальность", href: "/privacy" },
    ],
  },
] as const;

export function AppFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "-mb-28 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] mt-[60px] bg-gf-bg-alt pb-32 pt-10 text-gf-body-s font-normal leading-[normal] text-gf-text-secondary md:-mb-6 md:py-10",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 md:px-[104px]">
        <div className="grid gap-10 md:grid-cols-[320px_repeat(5,minmax(0,1fr))]">
          <div className="flex flex-col items-start gap-4">
            <Image
              src={getfloraBigLogo}
              alt="Getflora"
              className="h-12 w-auto"
            />
            <p className="max-w-[320px] text-gf-body-s font-normal leading-[normal] text-gf-text-secondary">
              Маркетплейс для продажи и покупки цветочных букетов. Дайте цветам вторую жизнь.
            </p>
          </div>

          {footerColumns.map((column) => (
            <FooterColumn key={column.title} title={column.title} links={column.links} />
          ))}

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-1">
            <FooterColumn
              title="Написать мне"
              links={[
                {
                  label: "support@getflora.ru",
                  href: "mailto:support@getflora.ru",
                },
              ]}
            />

            <section>
              <h2 className="text-gf-body-s font-bold leading-[normal] text-gf-text-primary">
                Соцсети
              </h2>
              <a
                className="mt-3 inline-flex size-6 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent"
                href="https://t.me/getflora"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram Getflora"
              >
                <Image src={telegramIcon} alt="" aria-hidden="true" className="size-6" />
              </a>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <p className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary md:flex-1">
            © 2026 Getflora
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly {
    label: string;
    href?: string;
  }[];
}) {
  return (
    <section>
      <h2 className="text-gf-body-s font-bold leading-[normal] text-gf-text-primary">
        {title}
      </h2>
      <div className="mt-3 grid gap-2">
        {links.map((link) => (
          link.href ? (
            <FooterLink key={link.label} href={link.href}>
              {link.label}
            </FooterLink>
          ) : (
            <span key={link.label} className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary">
              {link.label}
            </span>
          )
        ))}
      </div>
    </section>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="text-gf-body-s font-normal leading-[normal] text-gf-text-secondary transition-colors hover:text-gf-text-primary"
      href={href}
    >
      {children}
    </Link>
  );
}
