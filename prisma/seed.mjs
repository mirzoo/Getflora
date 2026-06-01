import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ListingType } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const images = {
  roses:
    "https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=900&q=80",
  tulips:
    "https://images.unsplash.com/photo-1520763185298-1b434c919102?auto=format&fit=crop&w=900&q=80",
  mixed:
    "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&w=900&q=80",
};

const listingLifetimeMs = 48 * 60 * 60 * 1000;

async function main() {
  const expiresAt = new Date(Date.now() + listingLifetimeMs);
  const sellers = await Promise.all([
    prisma.user.upsert({
      where: { email: "alina@example.com" },
      update: {},
      create: { name: "Алина", email: "alina@example.com", phone: "+79990000001" },
    }),
    prisma.user.upsert({
      where: { email: "maria@example.com" },
      update: {},
      create: { name: "Мария", email: "maria@example.com", phone: "+79990000002" },
    }),
    prisma.user.upsert({
      where: { email: "ilya@example.com" },
      update: {},
      create: { name: "Илья", email: "ilya@example.com", phone: "+79990000003" },
    }),
  ]);

  await prisma.listing.deleteMany();

  await prisma.listing.createMany({
    data: [
      {
        title: "Большой букет",
        description:
          "Подарили утром, стоял в воде около часа. Упаковка целая, самовывоз сегодня.",
        price: 2400,
        type: ListingType.SALE,
        city: "Санкт-Петербург",
        area: "Петроградская",
        sellerId: sellers[0].id,
        freshnessScore: 92,
        flowersCount: 31,
        flowerTypes: ["Розы", "Пионы", "Эвкалипт"],
        colors: ["pink", "green"],
        expiresAt,
      },
      {
        title: "Тюльпаны в вазе",
        description:
          "Свежие тюльпаны, забрать можно рядом с метро. Подойдут на небольшой подарок.",
        price: 1100,
        type: ListingType.SALE,
        city: "Санкт-Петербург",
        area: "Василеостровская",
        sellerId: sellers[1].id,
        freshnessScore: 86,
        flowersCount: 19,
        flowerTypes: ["Тюльпаны"],
        colors: ["pink", "white"],
        expiresAt,
      },
      {
        title: "Аукцион на пионы",
        description:
          "Большой букет после мероприятия. Ставки до вечера, отдам победителю сегодня.",
        price: 1800,
        type: ListingType.AUCTION,
        city: "Санкт-Петербург",
        area: "Невский проспект",
        sellerId: sellers[2].id,
        freshnessScore: 81,
        flowersCount: 25,
        flowerTypes: ["Пионы", "Розы"],
        colors: ["pink", "red"],
        expiresAt,
      },
    ],
  });

  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "asc" },
  });

  await prisma.listingImage.createMany({
    data: [
      {
        listingId: listings[0].id,
        url: images.roses,
        alt: "Розовый букет с розами, пионами и эвкалиптом",
        order: 0,
      },
      {
        listingId: listings[0].id,
        url: images.mixed,
        alt: "Розовый букет с розами, пионами и эвкалиптом",
        order: 1,
      },
      {
        listingId: listings[1].id,
        url: images.tulips,
        alt: "Свежие розовые тюльпаны",
        order: 0,
      },
      {
        listingId: listings[2].id,
        url: images.mixed,
        alt: "Букет пионов на аукционе",
        order: 0,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
