"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/features/admin/services/admin-auth";
import { writeAdminAction } from "@/features/admin/services/audit-log";
import {
  archiveListingAsAdmin,
  blockListing,
  deleteListingAsAdmin,
  unblockListing,
} from "@/features/admin/services/moderation-service";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function blockListingAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const listingId = readText(formData, "listingId");
  const reason = readText(formData, "reason");

  if (!listingId) {
    return { ok: false, error: "Не указано объявление." };
  }

  const result = await blockListing({
    listingId,
    adminId: admin.id,
    reason,
  });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "LISTING_BLOCKED",
    targetType: "listing",
    targetId: listingId,
    metadata: {
      reason: reason || null,
      previousStatus: result.previousStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/");

  return { ok: true };
}

export async function unblockListingAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const listingId = readText(formData, "listingId");

  if (!listingId) {
    return { ok: false, error: "Не указано объявление." };
  }

  const result = await unblockListing({ listingId });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "LISTING_UNBLOCKED",
    targetType: "listing",
    targetId: listingId,
    metadata: {
      previousStatus: result.previousStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/");

  return { ok: true };
}

export async function archiveListingAdminAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const listingId = readText(formData, "listingId");

  if (!listingId) {
    return { ok: false, error: "Не указано объявление." };
  }

  const result = await archiveListingAsAdmin({ listingId });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "LISTING_ARCHIVED",
    targetType: "listing",
    targetId: listingId,
    metadata: {
      previousStatus: result.previousStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath(`/admin/listings/${listingId}`);
  revalidatePath("/");

  return { ok: true };
}

export async function deleteListingAdminAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const listingId = readText(formData, "listingId");

  if (!listingId) {
    return { ok: false, error: "Не указано объявление." };
  }

  const result = await deleteListingAsAdmin({ listingId });

  if (!result.ok) {
    return result;
  }

  await writeAdminAction({
    adminId: admin.id,
    action: "LISTING_DELETED",
    targetType: "listing",
    targetId: listingId,
    metadata: {
      previousStatus: result.previousStatus,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/listings");
  revalidatePath("/");

  return { ok: true };
}
