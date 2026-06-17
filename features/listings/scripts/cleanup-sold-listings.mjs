import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
const now = new Date();

try {
  const expiredActiveListings = await prisma.listing.updateMany({
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
  const result = await prisma.listing.deleteMany({
    where: {
      status: "SOLD",
      soldAt: {
        lt: cutoff,
      },
    },
  });

  console.info(`Expired ${expiredActiveListings.count} active listings.`);
  console.info(`Deleted ${result.count} sold listings older than 48 hours.`);
} finally {
  await prisma.$disconnect();
}
