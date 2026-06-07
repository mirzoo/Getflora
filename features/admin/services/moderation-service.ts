import type { ListingStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { mapCreatedListingToCardModel } from "@/features/listings/services/listings-repository";
import { deleteListingImages } from "@/services/storage/s3-storage";

const adminListingInclude = {
  seller: true,
  images: {
    orderBy: {
      order: "asc" as const,
    },
  },
};

export async function blockListing(input: {
  listingId: string;
  adminId: string;
  reason?: string;
}) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: input.listingId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!listing) {
    return { ok: false as const, error: "Объявление не найдено." };
  }

  if (listing.status === "BLOCKED") {
    return { ok: false as const, error: "Объявление уже заблокировано." };
  }

  const updated = await prisma.listing.update({
    where: {
      id: input.listingId,
    },
    data: {
      status: "BLOCKED",
    },
    include: adminListingInclude,
  });

  return {
    ok: true as const,
    listing: updated,
    previousStatus: listing.status,
  };
}

export async function unblockListing(input: { listingId: string }) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: input.listingId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!listing) {
    return { ok: false as const, error: "Объявление не найдено." };
  }

  if (listing.status !== "BLOCKED") {
    return { ok: false as const, error: "Можно разблокировать только заблокированные объявления." };
  }

  const updated = await prisma.listing.update({
    where: {
      id: input.listingId,
    },
    data: {
      status: "ACTIVE",
    },
    include: adminListingInclude,
  });

  return {
    ok: true as const,
    listing: updated,
    previousStatus: listing.status,
  };
}

export async function archiveListingAsAdmin(input: { listingId: string }) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: input.listingId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!listing) {
    return { ok: false as const, error: "Объявление не найдено." };
  }

  if (listing.status === "EXPIRED" || listing.status === "SOLD") {
    return { ok: false as const, error: "Объявление уже снято или продано." };
  }

  const updated = await prisma.listing.update({
    where: {
      id: input.listingId,
    },
    data: {
      status: "EXPIRED",
      archivedAt: new Date(),
    },
    include: adminListingInclude,
  });

  return {
    ok: true as const,
    listing: updated,
    previousStatus: listing.status,
  };
}

export async function deleteListingAsAdmin(input: { listingId: string }) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: input.listingId,
    },
    include: {
      images: {
        select: {
          url: true,
        },
      },
    },
  });

  if (!listing) {
    return { ok: false as const, error: "Объявление не найдено." };
  }

  const imageUrls = listing.images.map((image) => image.url);
  const previousStatus = listing.status;

  await prisma.listing.delete({
    where: {
      id: input.listingId,
    },
  });

  await deleteListingImages(imageUrls);

  return {
    ok: true as const,
    listingId: listing.id,
    previousStatus,
  };
}

export async function banUser(input: {
  userId: string;
  adminId: string;
  reason?: string;
}) {
  if (input.userId === input.adminId) {
    return { ok: false as const, error: "Нельзя заблокировать самого себя." };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      bannedAt: true,
      email: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "Пользователь не найден." };
  }

  if (user.bannedAt) {
    return { ok: false as const, error: "Пользователь уже заблокирован." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        id: input.userId,
      },
      data: {
        bannedAt: new Date(),
        banReason: input.reason?.trim() || null,
        bannedById: input.adminId,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId: input.userId,
      },
    });

    await tx.listing.updateMany({
      where: {
        sellerId: input.userId,
        status: "ACTIVE",
      },
      data: {
        status: "BLOCKED",
      },
    });
  });

  return {
    ok: true as const,
    userId: user.id,
    email: user.email,
  };
}

export async function unbanUser(input: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
    select: {
      id: true,
      bannedAt: true,
      email: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "Пользователь не найден." };
  }

  if (!user.bannedAt) {
    return { ok: false as const, error: "Пользователь не заблокирован." };
  }

  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      bannedAt: null,
      banReason: null,
      bannedById: null,
    },
  });

  return {
    ok: true as const,
    userId: user.id,
    email: user.email,
  };
}

export function mapAdminListing(listing: Awaited<ReturnType<typeof blockListing>> extends { ok: true; listing: infer T }
  ? T
  : never) {
  return mapCreatedListingToCardModel(listing);
}

export type AdminListingStatus = ListingStatus;
