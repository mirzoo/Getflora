import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

try {
  const result = await prisma.listing.deleteMany({
    where: {
      status: "SOLD",
      soldAt: {
        lt: cutoff,
      },
    },
  });

  console.info(`Deleted ${result.count} sold listings older than 24 hours.`);
} finally {
  await prisma.$disconnect();
}
