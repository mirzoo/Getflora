import type { ReactNode } from "react";

type AppFrameProps = {
  children: ReactNode;
};

export function AppFrame({ children }: AppFrameProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 pb-6 pt-4 md:px-[104px]">
      {children}
    </main>
  );
}
