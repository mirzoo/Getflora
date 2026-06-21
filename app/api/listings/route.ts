import { NextResponse } from "next/server";

import { getSessionUser } from "@/features/auth/services/current-user";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  const listings = await getMarketplaceListings(user?.id);

  return NextResponse.json(
    { listings },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
