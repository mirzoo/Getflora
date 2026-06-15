import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/features/admin/components/admin-login-form";
import { getAdminUser } from "@/features/admin/services/admin-auth";

type AdminLoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeAdminNextPath(params?.next);
  const admin = await getAdminUser();

  if (admin) {
    redirect(nextPath);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gf-bg-base px-4 py-10">
      <AdminLoginForm nextPath={nextPath} />
    </main>
  );
}

function getSafeAdminNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/admin") || value.startsWith("/admin/login")) {
    return "/admin";
  }

  return value;
}
