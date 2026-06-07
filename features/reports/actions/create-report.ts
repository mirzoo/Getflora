"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/features/auth/services/current-user";
import { createListingReport } from "@/features/reports/services/reports-service";

type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createReportAction(formData: FormData): Promise<ActionResult> {
  let user;

  try {
    user = await requireCurrentUser();
  } catch {
    return { ok: false, error: "Войдите, чтобы отправить жалобу." };
  }

  const listingId = readText(formData, "listingId");
  const reason = readText(formData, "reason");
  const details = readText(formData, "details");

  if (!listingId) {
    return { ok: false, error: "Не указано объявление." };
  }

  const result = await createListingReport({
    reporterId: user.id,
    listingId,
    reason,
    details,
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/reports");

  return {
    ok: true,
    message: "Спасибо, мы рассмотрим жалобу.",
  };
}
