import Link from "next/link";

import { CompleteRegistrationForm } from "@/features/auth/components/complete-registration-form";
import { getMagicLinkSignUpContext } from "@/features/auth/services/magic-link";

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
    <main className="grid min-h-screen place-items-center bg-[#f4f1ed] p-5">
      {context.ok ? (
        <CompleteRegistrationForm token={token} email={context.email} />
      ) : (
        <section className="w-full max-w-md rounded-[28px] bg-background p-6 shadow-2xl">
          <h1 className="text-2xl font-bold">Ссылка не сработала</h1>
          <p className="mt-2 text-sm text-muted-foreground">{context.error}</p>
          <Link
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-primary-foreground"
            href="/?auth=1"
          >
            Запросить новую ссылку
          </Link>
        </section>
      )}
    </main>
  );
}
