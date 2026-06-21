import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ListingStatus, ListingType } from "@prisma/client";

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
  pinkWrap:
    "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=900&q=80",
  creamRoses:
    "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?auto=format&fit=crop&w=900&q=80",
  peonies:
    "https://images.unsplash.com/photo-1559563362-c667ba5f5480?auto=format&fit=crop&w=900&q=80",
  wildflowers:
    "https://images.unsplash.com/photo-1487070183336-b863922373d4?auto=format&fit=crop&w=900&q=80",
};

const listingLifetimeMs = 48 * 60 * 60 * 1000;

async function main() {
  const expiresAt = new Date(Date.now() + listingLifetimeMs);
  const quickAuctionExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  const now = Date.now();
  const receivedToday = new Date(now - 2 * 60 * 60 * 1000);
  const receivedYesterday = new Date(now - 26 * 60 * 60 * 1000);
  const soldThirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
  const soldTwoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  const soldSixHoursAgo = new Date(now - 6 * 60 * 60 * 1000);
  const soldYesterday = new Date(now - 22 * 60 * 60 * 1000);
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
        receivedAt: receivedToday,
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
        receivedAt: receivedToday,
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
        receivedAt: receivedYesterday,
        flowersCount: 25,
        flowerTypes: ["Пионы", "Розы"],
        colors: ["pink", "red"],
        expiresAt,
      },
      {
        title: "Тестовый быстрый аукцион",
        description:
          "Dev-аукцион на 2 минуты для проверки ставок, завершения и состояния победителя.",
        price: 1000,
        type: ListingType.AUCTION,
        city: "Москва",
        area: "Тверская",
        sellerId: sellers[2].id,
        freshnessScore: 94,
        receivedAt: receivedToday,
        flowersCount: 23,
        flowerTypes: ["Розы", "Пионы"],
        colors: ["red", "pink"],
        expiresAt: quickAuctionExpiresAt,
      },
      {
        title: "Букет «Клубничное мороженое»",
        description: "Нежный розовый букет уже нашел покупателя.",
        price: 1800,
        type: ListingType.SALE,
        status: ListingStatus.SOLD,
        city: "Санкт-Петербург",
        area: "Петроградская",
        sellerId: sellers[0].id,
        freshnessScore: 88,
        receivedAt: receivedToday,
        flowersCount: 21,
        flowerTypes: ["Розы", "Пионы", "Эвкалипт"],
        colors: ["pink", "white"],
        soldAt: soldThirtyMinutesAgo,
        expiresAt,
      },
      {
        title: "Кремовые розы",
        description: "Проданный букет для проверки состояния карточки.",
        price: 1500,
        type: ListingType.SALE,
        status: ListingStatus.SOLD,
        city: "Санкт-Петербург",
        area: "Василеостровская",
        sellerId: sellers[1].id,
        freshnessScore: 84,
        receivedAt: receivedToday,
        flowersCount: 15,
        flowerTypes: ["Розы", "Гипсофила"],
        colors: ["white", "green"],
        soldAt: soldTwoHoursAgo,
        expiresAt,
      },
      {
        title: "Пионы после свидания",
        description: "Проданный букет для главной ленты.",
        price: 2200,
        type: ListingType.SALE,
        status: ListingStatus.SOLD,
        city: "Санкт-Петербург",
        area: "Невский проспект",
        sellerId: sellers[2].id,
        freshnessScore: 80,
        receivedAt: receivedYesterday,
        flowersCount: 17,
        flowerTypes: ["Пионы", "Розы"],
        colors: ["pink", "red"],
        soldAt: soldSixHoursAgo,
        expiresAt,
      },
      {
        title: "Полевой микс",
        description: "Проданный букет для проверки 48-часового окна.",
        price: 900,
        type: ListingType.SALE,
        status: ListingStatus.SOLD,
        city: "Санкт-Петербург",
        area: "Адмиралтейская",
        sellerId: sellers[0].id,
        freshnessScore: 76,
        receivedAt: receivedYesterday,
        flowersCount: 27,
        flowerTypes: ["Ромашки", "Хризантемы", "Зелень"],
        colors: ["white", "green"],
        soldAt: soldYesterday,
        expiresAt,
      },
    ],
  });

  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "asc" },
  });
  const listingByTitle = new Map(listings.map((listing) => [listing.title, listing]));

  await prisma.listingImage.createMany({
    data: [
      {
        listingId: listingByTitle.get("Большой букет").id,
        url: images.roses,
        alt: "Розовый букет с розами, пионами и эвкалиптом",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Большой букет").id,
        url: images.mixed,
        alt: "Розовый букет с розами, пионами и эвкалиптом",
        order: 1,
      },
      {
        listingId: listingByTitle.get("Тюльпаны в вазе").id,
        url: images.tulips,
        alt: "Свежие розовые тюльпаны",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Аукцион на пионы").id,
        url: images.mixed,
        alt: "Букет пионов на аукционе",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Тестовый быстрый аукцион").id,
        url: images.peonies,
        alt: "Тестовый быстрый аукцион на букет",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Букет «Клубничное мороженое»").id,
        url: images.pinkWrap,
        alt: "Проданный розовый букет",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Кремовые розы").id,
        url: images.creamRoses,
        alt: "Проданный букет кремовых роз",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Пионы после свидания").id,
        url: images.peonies,
        alt: "Проданный букет пионов",
        order: 0,
      },
      {
        listingId: listingByTitle.get("Полевой микс").id,
        url: images.wildflowers,
        alt: "Проданный полевой букет",
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
