import type { Metadata } from "next";

import { InfoLinkGrid, InfoPage, InfoSection } from "@/components/seo/info-page";

export const metadata: Metadata = {
  title: "Страница не найдена | Getflora",
  description:
    "Страница Getflora не найдена. Вернитесь на главную, чтобы посмотреть свежие букеты или разместить объявление.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFoundPage() {
  return (
    <InfoPage
      title="Страница не найдена"
      lead="Такой страницы нет или ссылка устарела. Можно вернуться на главную и посмотреть актуальные букеты."
    >
      <InfoSection title="Что можно сделать">
        <p>
          Перейдите в маркетплейс, чтобы найти свежие букеты рядом с собой, или
          откройте раздел помощи, если хотели узнать, как работает покупка и продажа.
        </p>
      </InfoSection>

      <InfoLinkGrid
        links={[
          {
            href: "/",
            label: "На главную",
            description: "Открыть маркетплейс свежих букетов.",
          },
          {
            href: "/faq",
            label: "FAQ",
            description: "Ответы на частые вопросы о Getflora.",
          },
        ]}
      />
    </InfoPage>
  );
}
