import type { ReactNode } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  lead: string;
  children: ReactNode;
};

export function LegalPage({ title, updatedAt, lead, children }: LegalPageProps) {
  return (
    <AppFrame>
      <AppHeader leftHref="/" leftLabel="Главное" showLeftIcon={false} />
      <article className="mx-auto w-full max-w-[900px] py-8 text-gf-text-primary md:py-12">
        <header className="border-b border-gf-border pb-8">
          <p className="text-gf-body-s text-gf-text-secondary">Редакция от {updatedAt}</p>
          <h1 className="mt-3 text-[36px] font-extrabold leading-[1.05] tracking-normal text-gf-text-primary md:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[760px] text-gf-body-l text-gf-text-secondary">
            {lead}
          </p>
        </header>
        <div className="legal-content mt-8 grid gap-8 text-gf-body-m leading-7 text-gf-text-primary">
          {children}
        </div>
      </article>
    </AppFrame>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <h2 className="text-[22px] font-bold leading-tight text-gf-text-primary">{title}</h2>
      <div className="grid gap-3 text-gf-text-secondary">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}
