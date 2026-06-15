"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Flag, Flower2, LogOut, MessageCircle, Sprout, Users } from "lucide-react";

import { signOutAdminAction } from "@/features/admin/actions/admin-session";

const links = [
  { href: "/admin", label: "Обзор", icon: BarChart3 },
  { href: "/admin/support", label: "Чаты", icon: MessageCircle },
  { href: "/admin/reports", label: "Жалобы", icon: Flag },
  { href: "/admin/listings", label: "Объявления", icon: Flower2 },
  { href: "/admin/users", label: "Пользователи", icon: Users },
];

export function AdminNav({
  adminName,
  adminEmail,
}: {
  adminName: string;
  adminEmail: string | null;
}) {
  const currentPath = usePathname();
  const initials = adminName.trim().slice(0, 1).toUpperCase() || "A";

  return (
    <div className="flex h-full flex-col gap-5 px-4 py-4 sm:px-5 lg:py-6">
      <Link href="/admin" className="flex items-center gap-3 px-2">
        <span className="flex size-9 items-center justify-center rounded-[8px] bg-gf-text-primary text-gf-bg-base">
          <Sprout className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold leading-5">Getflora</span>
          <span className="block text-xs leading-4 text-gf-text-secondary">Control</span>
        </span>
      </Link>

      <div className="flex items-center gap-3 rounded-[8px] bg-gf-bg-alt px-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gf-bg-base text-xs font-semibold text-gf-text-primary">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium leading-5">{adminName}</span>
          <span className="block truncate text-xs leading-4 text-gf-text-secondary">
            {adminEmail ?? "Администратор"}
          </span>
        </span>
      </div>

      <nav className="flex flex-wrap gap-1 lg:flex-col">
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
              className={`inline-flex h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition ${
                isActive
                  ? "bg-gf-bg-alt text-gf-text-primary"
                  : "text-gf-text-primary hover:bg-gf-bg-alt"
              }`}
            >
              <Icon className="size-4 text-gf-text-secondary" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <form action={signOutAdminAction} className="mt-auto">
        <button
          className="inline-flex h-10 w-full items-center gap-3 rounded-[8px] px-3 text-left text-sm font-medium text-gf-text-secondary transition hover:bg-gf-bg-alt hover:text-gf-text-primary"
          type="submit"
        >
          <LogOut className="size-4" />
          Выйти
        </button>
      </form>
    </div>
  );
}
