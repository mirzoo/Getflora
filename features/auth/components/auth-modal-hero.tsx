import Image from "next/image";

import { cn } from "@/lib/utils";

type AuthModalHeroProps = {
  className?: string;
};

export function AuthModalHero({ className }: AuthModalHeroProps) {
  return (
    <div className={cn("w-[532px] shrink-0 p-2", className)}>
      <div className="relative h-full min-h-[567px] w-full overflow-hidden rounded-[40px]">
        <Image
          src="/auth/modal-hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 0px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gf-bg-accent/30 to-black/30 backdrop-blur-[2px]" />
        <div className="absolute bottom-10 left-10 right-10 text-[28px] font-extrabold leading-none text-white">
          <p>Покупайте букеты</p>
          <p>до 70% дешевле</p>
        </div>
      </div>
    </div>
  );
}
