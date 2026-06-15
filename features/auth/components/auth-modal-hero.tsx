"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AuthModalHeroProps = {
  className?: string;
};

const heroPhrases = [
  "Покупайте букеты\nдо 70% дешевле",
  "Аукционы на букеты\nв реальном времени",
  "Вторая жизнь свежим цветам",
];

const typingDelay = 55;
const deletingDelay = 28;
const completedPause = 1600;
const emptyPause = 300;

export function AuthModalHero({ className }: AuthModalHeroProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visibleLength, setVisibleLength] = useState(heroPhrases[0].length);
  const [isDeleting, setIsDeleting] = useState(true);

  useEffect(() => {
    const phrase = heroPhrases[phraseIndex];
    const isComplete = visibleLength === phrase.length;
    const isEmpty = visibleLength === 0;
    const delay = isDeleting
      ? isEmpty
        ? emptyPause
        : deletingDelay
      : isComplete
        ? completedPause
        : typingDelay;

    const timer = window.setTimeout(() => {
      if (isDeleting) {
        if (isEmpty) {
          setPhraseIndex((current) => (current + 1) % heroPhrases.length);
          setIsDeleting(false);
          return;
        }

        setVisibleLength((current) => current - 1);
        return;
      }

      if (isComplete) {
        setIsDeleting(true);
        return;
      }

      setVisibleLength((current) => current + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [isDeleting, phraseIndex, visibleLength]);

  const visibleText = heroPhrases[phraseIndex].slice(0, visibleLength);

  return (
    <div className={cn("w-[532px] shrink-0 p-2", className)}>
      <div className="relative h-full min-h-0 w-full overflow-hidden rounded-[32px] lg:min-h-[567px] lg:rounded-[44px]">
        <div className="absolute bottom-10 left-8 right-8 z-20 text-center text-gf-h5 font-extrabold leading-[normal] text-white lg:left-10 lg:right-10 lg:h-[68px] lg:text-left">
          <p className="whitespace-pre-line">
            {visibleText}
            <span aria-hidden="true">|</span>
          </p>
        </div>
        <div className="absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(253,70,4,0.32)_0%,rgba(0,0,0,0.32)_100%)]" />
        <Image
          src="/auth/modal-hero.jpg"
          alt=""
          fill
          priority
          className="z-0 object-cover"
          sizes="(min-width: 1280px) 462px, 100vw"
        />
      </div>
    </div>
  );
}
