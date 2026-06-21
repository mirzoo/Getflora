import type { Metadata } from "next";

import { InfoLinkGrid, InfoPage, InfoSection } from "@/components/seo/info-page";

const faqItems = [
  {
    question: "Что такое Getflora?",
    answer:
      "Getflora — маркетплейс для покупки и продажи свежих подаренных букетов. Сервис помогает продавцу разместить букет, а покупателю найти цветы дешевле обычного.",
  },
  {
    question: "Getflora продаёт букеты сам?",
    answer:
      "Нет. Getflora предоставляет площадку, объявления, чат и модерацию. Сделку, оплату и передачу букета пользователи согласуют между собой.",
  },
  {
    question: "Нужна ли регистрация?",
    answer:
      "Гость может смотреть маркетплейс. Для публикации объявления, чата, избранного и покупки нужен вход в аккаунт.",
  },
  {
    question: "Как быстрее продать букет?",
    answer:
      "Добавьте актуальное фото, честно опишите состояние цветов, укажите район передачи и поставьте понятную цену.",
  },
  {
    question: "Можно ли продавать несвежие цветы?",
    answer:
      "Объявление должно честно описывать состояние букета. Старые, чужие или вводящие в заблуждение фотографии могут стать причиной жалобы или модерации.",
  },
] as const;

export const metadata: Metadata = {
  title: "FAQ о покупке и продаже букетов | Getflora",
  description:
    "Ответы на частые вопросы о Getflora: как продать букет, как купить цветы, зачем нужен аккаунт и как работает маркетплейс.",
  alternates: {
    canonical: "/faq",
  },
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <InfoPage
      title="FAQ"
      lead="Ответы на частые вопросы о Getflora, продаже свежих букетов, покупке цветов и работе маркетплейса."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {faqItems.map((item) => (
        <InfoSection key={item.question} title={item.question}>
          <p>{item.answer}</p>
        </InfoSection>
      ))}

      <InfoLinkGrid
        links={[
          {
            href: "/sell",
            label: "Как продавать",
            description: "Как подготовить объявление о букете.",
          },
          {
            href: "/about",
            label: "Что делаем",
            description: "Зачем существует Getflora.",
          },
        ]}
      />
    </InfoPage>
  );
}
