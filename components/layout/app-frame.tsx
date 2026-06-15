import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppFrameProps = {
  children: ReactNode;
  className?: string;
};

export function AppFrame({ children, className }: AppFrameProps) {
  return (
    <main className={cn("mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-28 pt-4 md:px-10 md:pb-6 xl:px-[104px]", className)}>
      {children}
    </main>
  );
}
