import { redirect } from "next/navigation";

import { hasValidAdminSession } from "@/features/admin/services/admin-session";
import { requireCurrentUser, type CurrentUserModel } from "@/features/auth/services/current-user";

export type AdminUserModel = CurrentUserModel;

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  return parseAdminEmails().has(email.trim().toLowerCase());
}

export async function getAdminUser(): Promise<AdminUserModel | null> {
  try {
    const user = await requireCurrentUser();

    if (!isAdminEmail(user.email)) {
      return null;
    }

    if (!(await hasValidAdminSession(user.id))) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminUserModel> {
  const user = await getAdminUser();

  if (!user) {
    redirect("/admin/login?next=/admin");
  }

  return user;
}

export async function requireAdminAction(): Promise<AdminUserModel> {
  let user: AdminUserModel;

  try {
    user = await requireCurrentUser();
  } catch {
    throw new Error("ADMIN_REQUIRED");
  }

  if (!isAdminEmail(user.email)) {
    throw new Error("ADMIN_REQUIRED");
  }

  if (!(await hasValidAdminSession(user.id))) {
    throw new Error("ADMIN_REQUIRED");
  }

  return user;
}
