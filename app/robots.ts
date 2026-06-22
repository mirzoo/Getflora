import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getflora.ru";
const appHost = new URL(appUrl).host;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/auth", "/messages"],
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
    host: appHost,
  };
}
