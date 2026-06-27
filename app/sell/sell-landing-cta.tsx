"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { trackAnalyticsEvent } from "@/lib/analytics";

type SellLandingCtaProps = {
  source: "header" | "hero" | "final_cta";
  label?: string;
  className?: string;
};

export function SellLandingCta({
  source,
  label = "Продать букет",
  className,
}: SellLandingCtaProps) {
  return (
    <Button
      asChild
      className={className}
      onClick={() => {
        trackAnalyticsEvent("sell_landing_cta_clicked", {
          source,
        });
      }}
    >
      <Link href="/?sell=1">{label}</Link>
    </Button>
  );
}
