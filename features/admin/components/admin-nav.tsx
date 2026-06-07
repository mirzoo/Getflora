"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Flag, Flower2, Users } from "lucide-react";

const links = [
  { href: "/admin", label: "Обзор", icon: BarChart3 },
  { href: "/admin/reports", label: "Жалобы", icon: Flag },
  { href: "/admin/listings", label: "Объявления", icon: Flower2 },
  { href: "/admin/users", label: "Пользователи", icon: Users },
];

export function AdminNav() {
  const currentPath = usePathname();

  return (
    <nav className="flex max-w-full flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        const isActive =
          link.href === "/admin"
            ? currentPath === "/admin"
            : currentPath.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-white/70 text-foreground hover:bg-white"
            }`}
          >
            <Icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="inline-flex items-center rounded-full border border-border bg-white/50 px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-white"
      >
        На сайт
      </Link>
    </nav>
  );
}
