import type { Metadata } from "next";

import { InfoLinkGrid, InfoList, InfoPage, InfoSection } from "@/components/seo/info-page";

export const metadata: Metadata = {
  title: "Как работают ставки на букеты | Getflora",
  description:
    "Как устроен аукционный формат Getflora: стартовая цена, срок объявления, текущая ставка и договорённость с покупателем.",
  alternates: {
    canonical: "/how-bids-work",
  },
};

export default function HowBidsWorkPage() {
  return (
    <InfoPage
      title="Как делать ставки"
      lead="Аукционный формат помогает быстро найти честную цену для свежего букета, особенно если его нужно передать в тот же день."
    >
      <InfoSection title="Идея аукциона">
        <p>
          Продавец задаёт стартовую цену, а покупатели ориентируются на текущее
          предложение и состояние букета. Такой формат подходит для срочных
          букетов после мероприятий, праздников или доставки.
        </p>
      </InfoSection>

      <InfoSection title="На что смотреть покупателю">
        <InfoList>
          <li>когда букет был получен;</li>
          <li>насколько свежими выглядят цветы на фото;</li>
          <li>удобен ли район передачи;</li>
          <li>сколько времени осталось до окончания объявления;</li>
          <li>готов ли продавец быстро ответить в чате.</li>
        </InfoList>
      </InfoSection>

      <InfoSection title="Статус функции">
        <p>
          Аукционный сценарий развивается в beta-версии Getflora. Мы постепенно
          уточняем правила ставок, отображение победителя и историю предложений,
          чтобы механика была понятной для продавцов и покупателей.
        </p>
      </InfoSection>

      <InfoLinkGrid
        links={[
          {
            href: "/sell",
            label: "Как продавать",
            description: "Как подготовить объявление и цену для букета.",
          },
          {
            href: "/updates",
            label: "Что нового",
            description: "Новые функции и изменения в Getflora.",
          },
        ]}
      />
    </InfoPage>
  );
}
