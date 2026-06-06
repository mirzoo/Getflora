import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { consumeMagicLink } from "@/features/auth/services/magic-link";

type MagicAuthPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function MagicAuthPage({ searchParams }: MagicAuthPageProps) {
  const params = await searchParams;
  const result = await consumeMagicLink(params.token ?? "");

  if (result.ok) {
    redirect("/?account=1");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted p-5">
      <section className="w-full max-w-md rounded-[28px] bg-background p-6 shadow-xl">
        <h1 className="text-2xl font-bold">Ссылка не сработала</h1>
        <p className="mt-3 text-sm text-muted-foreground">{result.error}</p>
        <Button asChild className="mt-6 w-full">
          <Link href="/?auth=1">Запросить новую ссылку</Link>
        </Button>
      </section>
    </main>
  );
}
