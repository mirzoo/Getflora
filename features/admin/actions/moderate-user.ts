"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/features/admin/services/admin-auth";
import { writeAdminAction } from "@/features/admin/services/audit-log";
import { banUser, unbanUser } from "@/features/admin/services/moderation-service";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function banUserAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const userId = readText(formData, "userId");
  const reason = readText(formData, "reason");

  if (!userId) {
    return { ok: false, error: "Не указан пользователь." };
  }

  const result = await banUser({
    userId,
    adminId: admin.id,
    reason,
  });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "USER_BANNED",
    targetType: "user",
    targetId: userId,
    metadata: {
      reason: reason || null,
      email: result.email,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/");

  return { ok: true };
}

export async function unbanUserAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const userId = readText(formData, "userId");

  if (!userId) {
    return { ok: false, error: "Не указан пользователь." };
  }

  const result = await unbanUser({ userId });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "USER_UNBANNED",
    targetType: "user",
    targetId: userId,
    metadata: {
      email: result.email,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return { ok: true };
}
