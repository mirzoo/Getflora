import { prisma } from "@/db/prisma";

const soldListingRetentionMs = 24 * 60 * 60 * 1000;

export async function cleanupListingsLifecycle() {
  await cleanupExpiredActiveListings();
  await cleanupExpiredSoldListings();
}

export async function cleanupExpiredActiveListings() {
  const now = new Date();

  try {
    const result = await prisma.listing.updateMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
        archivedAt: now,
      },
    });

    if (result.count > 0) {
      console.info(`Expired ${result.count} active listings after their lifetime ended.`);
    }
  } catch (error) {
    console.warn("Failed to expire old active listings.", error);
  }
}

export async function cleanupExpiredSoldListings() {
  const cutoff = new Date(Date.now() - soldListingRetentionMs);

  try {
    const result = await prisma.listing.deleteMany({
      where: {
        status: "SOLD",
        soldAt: {
          lt: cutoff,
        },
      },
    });

    if (result.count > 0) {
      console.info(`Deleted ${result.count} sold listings older than 24 hours.`);
    }
  } catch (error) {
    console.warn("Failed to cleanup old sold listings.", error);
  }
}
