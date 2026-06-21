import Link from "next/link";
import type { ReactNode } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { AppHeader } from "@/components/layout/app-header";

type InfoPageProps = {
  title: string;
  lead: string;
  children: ReactNode;
};

export function InfoPage({ title, lead, children }: InfoPageProps) {
  return (
    <AppFrame>
      <AppHeader leftHref="/" leftLabel="Главное" showLeftIcon={false} />
      <article className="mx-auto w-full max-w-[900px] py-8 text-gf-text-primary md:py-12">
        <header className="border-b border-gf-border pb-8">
          <h1 className="text-[36px] font-extrabold leading-[1.05] tracking-normal text-gf-text-primary md:text-[56px]">
            {title}
          </h1>
          <p className="mt-5 max-w-[760px] text-gf-body-l text-gf-text-secondary">
            {lead}
          </p>
        </header>
        <div className="mt-8 grid gap-8 text-gf-body-m leading-7 text-gf-text-primary">
          {children}
        </div>
      </article>
    </AppFrame>
  );
}

export function InfoSection({
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

export function InfoList({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5">{children}</ul>;
}

export function InfoLinkGrid({
  links,
}: {
  links: readonly {
    href: string;
    label: string;
    description: string;
  }[];
}) {
  return (
    <nav className="grid gap-3 md:grid-cols-2" aria-label="Связанные разделы">
      {links.map((link) => (
        <Link
          key={link.href}
          className="rounded-lg border border-gf-border bg-gf-bg-primary p-4 transition-colors hover:border-gf-bg-accent"
          href={link.href}
        >
          <span className="block text-gf-body-m font-bold text-gf-text-primary">
            {link.label}
          </span>
          <span className="mt-1 block text-gf-body-s leading-6 text-gf-text-secondary">
            {link.description}
          </span>
        </Link>
      ))}
    </nav>
  );
}
