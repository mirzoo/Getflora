import Link from "next/link";

import { AuthModalHero } from "@/features/auth/components/auth-modal-hero";
import { CompleteRegistrationForm } from "@/features/auth/components/complete-registration-form";
import { getMagicLinkSignUpContext } from "@/features/auth/services/magic-link";
import { ButtonBox } from "@/components/ui/button-box";

type CompleteRegistrationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function CompleteRegistrationPage({ searchParams }: CompleteRegistrationPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const context = await getMagicLinkSignUpContext(token);

  return (
    <main className="flex min-h-screen flex-col bg-gf-bg-base xl:flex-row xl:items-stretch">
      <AuthModalHero className="hidden xl:flex" />

      <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-16 xl:px-[88px] xl:py-[120px]">
        {context.ok ? (
          <CompleteRegistrationForm token={token} email={context.email} />
        ) : (
          <section className="mx-auto flex w-full max-w-[492px] flex-col">
            <div className="space-y-1">
              <h1 className="text-[28px] font-extrabold leading-none text-gf-text-primary">Ссылка не сработала</h1>
              <p className="text-base leading-5 text-gf-text-secondary">{context.error}</p>
            </div>

            <ButtonBox className="mt-8" variant="primary" asChild>
              <Link href="/?auth=1">Запросить новую ссылку</Link>
            </ButtonBox>
          </section>
        )}
      </div>
    </main>
  );
}
