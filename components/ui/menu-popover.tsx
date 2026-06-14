import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MenuPopoverSlot({
  children,
  popover,
  showPopover,
}: {
  children: ReactNode;
  popover: ReactNode;
  showPopover: boolean;
}) {
  return (
    <div className="relative">
      {children}
      {showPopover ? popover : null}
    </div>
  );
}

export function MenuPopover({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-1/2 top-[calc(100%+4px)] z-30 w-[min(323px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-gf-bg-base shadow-[0_4px_24px_rgb(0_0_0/0.18)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MenuPopoverOption({
  selected = false,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center px-4 py-4 text-left text-gf-body-xs font-medium leading-[normal] text-gf-text-primary transition-colors hover:bg-gf-bg-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gf-bg-accent",
        selected && "text-gf-text-action",
        className,
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
