import type { AdminActionType, Prisma } from "@prisma/client";

import { prisma } from "@/db/prisma";

type WriteAdminActionInput = {
  adminId: string;
  action: AdminActionType;
  targetType: string;
  targetId: string;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAdminAction(input: WriteAdminActionInput) {
  return prisma.adminAction.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  });
}

export async function getRecentAdminActions(limit = 10) {
  return prisma.adminAction.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function countOpenReports() {
  return prisma.report.count({
    where: {
      status: "OPEN",
    },
  });
}
