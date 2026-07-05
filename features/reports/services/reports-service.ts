import { prisma } from "@/db/prisma";
import { isReportReason } from "@/features/reports/constants/report-reasons";
import { checkRateLimit } from "@/services/rate-limit";

const reportRateLimitWindowMinutes = 60;
const reportRateLimitMax = 5;
const maxDetailsLength = 500;
const repeatReportCooldownMs = 24 * 60 * 60 * 1000;

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

  const rateLimit = await checkRateLimit({
    scope: "report-create",
    identifier: input.reporterId,
    windowMs: reportRateLimitWindowMinutes * 60 * 1000,
    max: reportRateLimitMax,
  });

  if (!rateLimit.ok) {
    return { ok: false as const, error: "Слишком много жалоб. Попробуйте позже." };
  }

  // Дубликат: открытая жалоба или любая жалоба за последние 24 часа
  // (иначе после закрытия жалобы её можно слать бесконечно).
  const duplicateReport = await prisma.report.findFirst({
    where: {
      reporterId: input.reporterId,
      targetType: "LISTING",
      targetId: input.listingId,
      OR: [
        {
          status: "OPEN",
        },
        {
          createdAt: {
            gte: new Date(Date.now() - repeatReportCooldownMs),
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (duplicateReport) {
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
