import { prisma } from "@/db/prisma";
import { isReportReason } from "@/features/reports/constants/report-reasons";

const reportRateLimitWindowMinutes = 60;
const reportRateLimitMax = 5;
const maxDetailsLength = 500;

export async function createListingReport(input: {
  reporterId: string;
  listingId: string;
  reason: string;
  details?: string;
}) {
  if (!isReportReason(input.reason)) {
    return { ok: false as const, error: "Выберите причину жалобы." };
  }

  const details = input.details?.trim() ?? "";

  if (details.length > maxDetailsLength) {
    return { ok: false as const, error: "Комментарий слишком длинный." };
  }

  const listing = await prisma.listing.findUnique({
    where: {
      id: input.listingId,
    },
    select: {
      id: true,
      sellerId: true,
      status: true,
    },
  });

  if (!listing) {
    return { ok: false as const, error: "Объявление не найдено." };
  }

  if (listing.sellerId === input.reporterId) {
    return { ok: false as const, error: "Нельзя пожаловаться на своё объявление." };
  }

  const windowStart = new Date(Date.now() - reportRateLimitWindowMinutes * 60 * 1000);
  const recentReportCount = await prisma.report.count({
    where: {
      reporterId: input.reporterId,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recentReportCount >= reportRateLimitMax) {
    return { ok: false as const, error: "Слишком много жалоб. Попробуйте позже." };
  }

  const duplicateOpenReport = await prisma.report.findFirst({
    where: {
      reporterId: input.reporterId,
      targetType: "LISTING",
      targetId: input.listingId,
      status: "OPEN",
    },
    select: {
      id: true,
    },
  });

  if (duplicateOpenReport) {
    return { ok: false as const, error: "Вы уже отправили жалобу на это объявление." };
  }

  await prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetType: "LISTING",
      targetId: input.listingId,
      reason: input.reason,
      details: details || null,
    },
  });

  return { ok: true as const };
}
