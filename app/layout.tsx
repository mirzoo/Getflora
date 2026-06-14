import type { Metadata } from "next";

import { YandexMetrica } from "@/components/analytics/yandex-metrica";

import "./globals.css";

export const metadata: Metadata = {
  title: "Getflora",
  description: "Маркетплейс для перепродажи свежих букетов.",
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
