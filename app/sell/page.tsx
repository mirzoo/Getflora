import Image from "next/image";
import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";

import checkIcon from "@/assets/icon/icn_m_check-circle.svg";
import { AppFrame } from "@/components/layout/app-frame";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { SellLandingCta } from "@/app/sell/sell-landing-cta";
import { SellStepsCarousel } from "@/app/sell/sell-steps-carousel";

const robotoCondensed = Roboto_Condensed({
  subsets: ["cyrillic", "latin"],
  weight: "900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Продать букет рядом с вами | Getflora",
  description:
    "Подарили букет, который некуда поставить? Разместите его на Getflora: фото, район, цена и чат с покупателем напрямую.",
  alternates: {
    canonical: "/sell",
  },
  openGraph: {
    title: "Продать букет рядом с вами | Getflora",
    description:
      "Разместите свежий букет на Getflora и договоритесь с покупателем напрямую.",
    url: "/sell",
  },
};

const benefits = [
  {
    title: "Быстрый сценарий",
    text: "Без каталога на первом экране: только понятный путь для продавца.",
  },
  {
    title: "Понятное доверие",
    text: "Фото, свежесть и район сразу отвечают на главный вопрос покупателя.",
  },
  {
    title: "Прямая сделка",
    text: "Getflora не хранит деньги: встреча и оплата обсуждаются в чате.",
  },
];

const steps = [
  {
    title: "Добавьте свой букет на наш сайт",
    text: "Сделайте несколько фото, укажите цену и район самовывоза",
    image: "/sell/step-add.png",
    imageAlt: "Телефон с формой размещения букета",
  },
  {
    title: "Покупатель находит ваш букет",
    text: "Мы показываем букеты тем, кто рядом с вами",
    image: "/sell/step-nearby.png",
    imageAlt: "Карта с букетами рядом",
  },
  {
    title: "Вы договариваетесь в чате и передаете букет",
    text: "Встречаетесь в удобном месте, получаете оплату.",
    image: "/sell/step-handoff.png",
    imageAlt: "Передача букета покупателю",
  },
];

const faqItems = [
  {
    question: "Кто вообще купит подаренный букет?",
    answer:
      "Чаще всего это люди, которым нужен свежий букет сегодня: на свидание, домой, в офис или как быстрый подарок рядом с ними.",
  },
  {
    question: "Какую цену поставить?",
    answer:
      "Ориентируйтесь на состояние и срочность. Для быстрой продажи обычно лучше поставить заметно дешевле салона, особенно если букет уже подарен.",
  },
  {
    question: "Что если букет не продался?",
    answer:
      "Можно отредактировать цену или снять объявление. Свежесть важна, поэтому лучше не тянуть с публикацией.",
  },
  {
    question: "Нужно ли самому доставлять?",
    answer:
      "Нет обязательного правила. Вы сами договариваетесь с покупателем: самовывоз, встреча рядом или доставка, если вам удобно.",
  },
];

export default function SellPage() {
  return (
    <AppFrame className="bg-gf-bg-base">
      <AppHeader />

      <section className="relative mx-auto min-h-[448px] w-full max-w-[1232px] pt-[205px] text-center md:min-h-[636px] md:pt-[255px]">
        <div className="pointer-events-none absolute left-1/2 top-[22px] h-[254px] w-[381px] -translate-x-1/2 md:top-[38px] md:h-[442px] md:w-[664px]">
          <Image
            src="/sell/hero-bouquet.png"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 664px, 381px"
            className="object-contain"
          />
          <div
            className="absolute inset-x-[-68px] bottom-[-8px] h-[210px] md:inset-x-[-120px] md:bottom-0 md:h-[330px]"
            style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, #fff 44%, #fff 100%)" }}
          />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[900px] flex-col items-center gap-6 overflow-visible">
          <div className="grid gap-2">
            <h1
              className={`${robotoCondensed.className} w-full overflow-visible text-balance text-[32px] font-black uppercase leading-[0.95] tracking-normal text-gf-text-primary md:text-[80px] md:leading-[0.92]`}
            >
              <span className="block">Не выбрасывайте</span>
              <span className="block">свежий букет</span>
            </h1>
            <p className="mx-auto max-w-[463px] text-pretty text-gf-body-m text-gf-text-secondary md:text-[20px] md:leading-[1.12]">
              Лучше отдайте его тому, кто хочет свежий букет, но не готов переплачивать
            </p>
          </div>
          <SellLandingCta
            source="hero"
            label="Разместить букет"
            className="h-12 rounded-2xl px-4 text-gf-body-m font-medium text-gf-text-on-accent active:scale-[0.96] transition-transform"
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1232px]">
        <SellStepsCarousel steps={steps} />
      </div>

      <section className="mx-auto grid w-full max-w-[1232px] gap-4 py-4 md:grid-cols-[1fr_2fr] md:py-10">
        <div className="p-0 md:py-8 md:pr-8">
          <h2 className="text-balance text-[30px] font-black uppercase leading-[0.98] text-gf-text-primary md:text-[48px]">
            Почему букет купят
          </h2>
          <p className="mt-4 text-pretty text-gf-body-m text-gf-text-secondary md:text-gf-body-l">
            Покупатель ищет не маркетплейс, а понятный свежий букет рядом и дешевле салона.
          </p>
        </div>

        <ul className="grid gap-4 md:grid-cols-2">
          {benefits.map((item) => (
            <li key={item.title} className="rounded-[32px] bg-gf-bg-alt p-5 md:p-6">
              <span className="grid size-12 place-items-center rounded-full bg-gf-bg-accent text-gf-body-m font-bold text-gf-text-on-accent">
                <Image src={checkIcon} alt="" aria-hidden="true" className="size-6 brightness-0 invert" />
              </span>
              <h3 className="mt-5 text-gf-body-l font-bold leading-tight text-gf-text-primary">{item.title}</h3>
              <p className="mt-2 text-pretty text-gf-body-m leading-[1.15] text-gf-text-secondary">{item.text}</p>
            </li>
          ))}
          <li className="rounded-[32px] bg-gf-bg-alt p-5 md:p-6">
            <span className="grid size-12 place-items-center rounded-full bg-gf-bg-accent text-gf-body-m font-bold text-gf-text-on-accent">
              <Image src={checkIcon} alt="" aria-hidden="true" className="size-6 brightness-0 invert" />
            </span>
            <h3 className="mt-5 text-gf-body-l font-bold leading-tight text-gf-text-primary">Свежесть важнее масштаба</h3>
            <p className="mt-2 text-pretty text-gf-body-m leading-[1.15] text-gf-text-secondary">
              Даже один хороший букет может сработать, если страница сразу объясняет пользу.
            </p>
          </li>
        </ul>
      </section>

      <section className="mx-auto w-full max-w-[1232px] py-4 md:py-10">
        <div>
          <div>
            <p className="text-gf-body-s font-bold uppercase leading-none text-primary">FAQ</p>
            <h2 className="mt-3 text-balance text-[34px] font-black uppercase leading-[0.98] text-gf-text-primary md:text-[56px]">
              Частые вопросы
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-[32px] bg-gf-bg-alt p-5 md:p-6">
              <h3 className="text-gf-body-l font-bold leading-tight text-gf-text-primary">{item.question}</h3>
              <p className="mt-2 text-pretty text-gf-body-m leading-[1.18] text-gf-text-secondary">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <AppFooter />
    </AppFrame>
  );
}
