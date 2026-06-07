import type { Metadata } from "next";

import { requireAdmin } from "@/features/admin/services/admin-auth";
import { AdminNav } from "@/features/admin/components/admin-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin - Getflora",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff7ed_0,#f4f1ed_34%,#eee7df_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-4 z-30 rounded-[30px] border border-white/70 bg-[#fffaf7]/90 p-4 shadow-[0_18px_60px_rgba(36,23,19,0.10)] backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Getflora Control
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#241713]">Админка</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Модерация объявлений, жалоб и пользователей.
              </p>
            </div>
            <AdminNav />
          </div>
        </header>
        <main className="flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
