import { requireAdmin } from "@/features/admin/services/admin-auth";
import { AdminNav } from "@/features/admin/components/admin-nav";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6">
        <header className="sticky top-4 z-30 rounded-3xl border border-[#e4ded8] bg-[#fffaf7]/95 p-4 backdrop-blur sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
