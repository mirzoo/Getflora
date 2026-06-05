import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
