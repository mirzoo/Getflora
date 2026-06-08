import type { ListingStatus, ReportStatus } from "@prisma/client";

import { prisma } from "@/db/prisma";
import { getListingImageDisplayUrl } from "@/services/storage/s3-storage";

const pageSize = 20;

type ListingWithImages = {
  images: Array<{
    url: string;
  }>;
};

export async function getAdminListings(input: {
  page?: number;
  status?: ListingStatus;
  query?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const query = input.query?.trim();

  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { city: { contains: query, mode: "insensitive" as const } },
            { seller: { name: { contains: query, mode: "insensitive" as const } } },
            { seller: { email: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            bannedAt: true,
          },
        },
        images: {
          orderBy: {
            order: "asc",
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    items: items.map(mapListingImageUrls),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminListingById(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: {
      id: listingId,
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          bannedAt: true,
          banReason: true,
          createdAt: true,
        },
      },
      images: {
        orderBy: {
          order: "asc",
        },
      },
      soldToBuyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return listing ? mapListingImageUrls(listing) : null;
}

export async function getAdminUsers(input: {
  page?: number;
  query?: string;
  bannedOnly?: boolean;
}) {
  const page = Math.max(1, input.page ?? 1);
  const query = input.query?.trim();

  const where = {
    ...(input.bannedOnly ? { bannedAt: { not: null } } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        bannedAt: true,
        banReason: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            reports: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bannedAt: true,
      banReason: true,
      bannedById: true,
      createdAt: true,
      listings: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 20,
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
            take: 1,
          },
        },
      },
      bannedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return user
    ? {
        ...user,
        listings: user.listings.map(mapListingImageUrls),
      }
    : null;
}

export async function getAdminReports(input: {
  page?: number;
  status?: ReportStatus;
}) {
  const page = Math.max(1, input.page ?? 1);

  const where = {
    ...(input.status ? { status: input.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAdminReportById(reportId: string) {
  return prisma.report.findUnique({
    where: {
      id: reportId,
    },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getAdminDashboardStats() {
  const [openReports, blockedListings, bannedUsers, activeListings] = await Promise.all([
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.listing.count({ where: { status: "BLOCKED" } }),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
    prisma.listing.count({ where: { status: "ACTIVE" } }),
  ]);

  return {
    openReports,
    blockedListings,
    bannedUsers,
    activeListings,
  };
}

function mapListingImageUrls<T extends ListingWithImages>(listing: T): T {
  return {
    ...listing,
    images: listing.images.map((image) => ({
      ...image,
      url: getListingImageDisplayUrl(image.url),
    })),
  };
}
