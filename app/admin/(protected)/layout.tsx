import { requireAdmin } from "@/features/admin/services/admin-auth";
import { AdminNav } from "@/features/admin/components/admin-nav";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-gf-bg-base text-gf-text-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-gf-border bg-gf-bg-base lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <AdminNav adminName={admin.name} adminEmail={admin.email} />
        </aside>
        <main className="min-w-0 flex-1 bg-gf-bg-alt">
          <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
