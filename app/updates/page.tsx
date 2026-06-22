import type { Metadata } from "next";

import { InfoLinkGrid, InfoList, InfoPage, InfoSection } from "@/components/seo/info-page";

export const metadata: Metadata = {
  title: "Что нового в Getflora | Getflora",
  description:
    "Обновления Getflora: новые функции маркетплейса, улучшения продажи букетов, чата, модерации и аукционного формата.",
  alternates: {
    canonical: "/updates",
  },
};

export default function UpdatesPage() {
  return (
    <InfoPage
      title="Что нового"
      lead="Здесь будут появляться важные изменения Getflora: новые функции, улучшения маркетплейса и заметки о развитии beta-версии."
    >
      <InfoSection title="Июнь 2026">
        <InfoList>
          <li>добавлен публичный домен Getflora и базовая SEO-настройка сайта;</li>
          <li>улучшены страницы для покупателей, продавцов и юридических документов;</li>
          <li>начата работа над аукционным форматом для срочной продажи букетов;</li>
          <li>добавлены чат, избранное, жалобы и модерация объявлений.</li>
        </InfoList>
      </InfoSection>

      <InfoSection title="Как мы будем обновлять страницу">
        <p>
          Когда в Getflora появляется заметная функция, этот раздел можно
          дополнять короткой записью: что изменилось, кому это полезно и как это
          влияет на покупку или продажу букетов.
        </p>
      </InfoSection>

      <InfoLinkGrid
        links={[
          {
            href: "/about",
            label: "Что делаем",
            description: "Коротко о Getflora и задаче сервиса.",
          },
          {
            href: "/how-bids-work",
            label: "Как делать ставки",
            description: "Что значит аукционный формат для букетов.",
          },
        ]}
      />
    </InfoPage>
  );
}
