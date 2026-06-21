import type { Metadata } from "next";

import { YandexMetrica } from "@/components/analytics/yandex-metrica";

import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getflora.ru";
const appName = "Getflora";
const appDescription =
  "Getflora — маркетплейс свежих подаренных букетов: покупайте цветы дешевле и продавайте букеты, которым можно дать вторую жизнь.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: appName,
  title: {
    default: "Getflora — маркетплейс свежих букетов",
    template: "%s",
  },
  description: appDescription,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/favicon/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: appName,
    title: "Getflora — маркетплейс свежих букетов",
    description: appDescription,
  },
  twitter: {
    card: "summary",
    title: "Getflora — маркетплейс свежих букетов",
    description: appDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <YandexMetrica />
      </body>
    </html>
  );
}
