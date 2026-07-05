import { NextResponse, type NextRequest } from "next/server";

import { getSessionUser } from "@/features/auth/services/current-user";
import { findCityNameByQueryParam } from "@/features/cities/data/cities";
import { getMarketplaceListings } from "@/features/listings/services/listings-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Город валидируется по известному списку; неизвестное значение игнорируем.
  const city = findCityNameByQueryParam(request.nextUrl.searchParams.get("city")) ?? undefined;
  const user = await getSessionUser();
  const listings = await getMarketplaceListings(user?.id, city);

  return NextResponse.json(
    { listings },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
