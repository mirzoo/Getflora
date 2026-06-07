"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/prisma";
import { requireAdminAction } from "@/features/admin/services/admin-auth";
import { writeAdminAction } from "@/features/admin/services/audit-log";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function dismissReportAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const reportId = readText(formData, "reportId");

  if (!reportId) {
    return { ok: false, error: "Не указана жалоба." };
  }

  const report = await prisma.report.findUnique({
    where: {
      id: reportId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!report) {
    return { ok: false, error: "Жалоба не найдена." };
  }

  if (report.status !== "OPEN") {
    return { ok: false, error: "Жалоба уже обработана." };
  }

  await prisma.report.update({
    where: {
      id: reportId,
    },
    data: {
      status: "DISMISSED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await writeAdminAction({
    adminId: admin.id,
    action: "REPORT_DISMISSED",
    targetType: "report",
    targetId: reportId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/reports");

  return { ok: true };
}

export async function markReportReviewedAction(formData: FormData): Promise<ActionResult> {
  let admin;

  try {
    admin = await requireAdminAction();
  } catch {
    return { ok: false, error: "Недостаточно прав." };
  }

  const reportId = readText(formData, "reportId");

  if (!reportId) {
    return { ok: false, error: "Не указана жалоба." };
  }

  const report = await prisma.report.findUnique({
    where: {
      id: reportId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!report) {
    return { ok: false, error: "Жалоба не найдена." };
  }

  if (report.status !== "OPEN") {
    return { ok: false, error: "Жалоба уже обработана." };
  }

  await prisma.report.update({
    where: {
      id: reportId,
    },
    data: {
      status: "REVIEWED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await writeAdminAction({
    adminId: admin.id,
    action: "REPORT_REVIEWED",
    targetType: "report",
    targetId: reportId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/reports");

  return { ok: true };
}
