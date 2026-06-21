import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getflora.ru";

const publicRoutes = [
  "",
  "/about",
  "/buy",
  "/sell",
  "/how-bids-work",
  "/updates",
  "/faq",
  "/terms",
  "/privacy",
  "/offer",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: new URL(route, appUrl).toString(),
    changeFrequency: route === "" ? "daily" : "monthly",
    priority: route === "" ? 1 : 0.4,
  }));
}
