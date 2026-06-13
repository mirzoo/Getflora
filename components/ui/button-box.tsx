import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonBoxVariants = cva(
  "inline-flex h-12 items-center justify-center rounded-2xl px-4 text-center text-gf-body-m font-medium leading-[normal] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-bg-accent disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-gf-bg-accent text-gf-text-on-accent hover:bg-gf-bg-accent-hover",
        float: "bg-gf-bg-alt text-gf-text-primary hover:bg-[#f2f2f2]",
        secondary:
          "bg-gf-bg-accent-opposite text-gf-text-action hover:bg-gf-bg-accent-opposite-hover hover:text-gf-text-action-hover",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      width: "full",
    },
  },
);

export interface ButtonBoxProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonBoxVariants> {
  asChild?: boolean;
}

export function ButtonBox({
  className,
  variant = "primary",
  width,
  asChild = false,
  type = "button",
  ...props
}: ButtonBoxProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonBoxVariants({ variant, width, className }))}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
