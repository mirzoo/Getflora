import Link from "next/link";

import { AuthModalHero } from "@/features/auth/components/auth-modal-hero";
import { OAuthCompleteRegistrationForm } from "@/features/auth/components/oauth-complete-registration-form";
import { getOAuthSignUpContext } from "@/features/auth/services/oauth";
import { ButtonBox } from "@/components/ui/button-box";

type OAuthCompleteRegistrationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function OAuthCompleteRegistrationPage({
  searchParams,
}: OAuthCompleteRegistrationPageProps) {
  const params = await searchParams;
  const token = params.token ?? "";
  const context = await getOAuthSignUpContext(token);

  return (
    <main className="flex min-h-screen flex-col bg-gf-bg-base xl:flex-row xl:items-stretch">
      <AuthModalHero className="hidden xl:flex" />

      <div className="flex flex-1 flex-col justify-center px-6 py-10 md:px-12 md:py-16 xl:px-[88px] xl:py-[120px]">
        {context.ok ? (
          <OAuthCompleteRegistrationForm
            token={token}
            email={context.email}
            initialName={context.name}
            avatarUrl={context.avatarUrl}
          />
        ) : (
          <section className="mx-auto flex w-full max-w-[492px] flex-col">
            <div className="space-y-1">
              <h1 className="text-[28px] font-extrabold leading-none text-gf-text-primary">Вход не сработал</h1>
              <p className="text-base leading-5 text-gf-text-secondary">{context.error}</p>
            </div>

            <ButtonBox className="mt-8" variant="primary" asChild>
              <Link href="/?auth=1">Попробовать ещё раз</Link>
            </ButtonBox>
          </section>
        )}
      </div>
    </main>
  );
}
