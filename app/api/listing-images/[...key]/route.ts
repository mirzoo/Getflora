import { NextResponse, type NextRequest } from "next/server";

import { getListingImageObject } from "@/services/storage/s3-storage";

type ListingImageRouteProps = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: NextRequest, { params }: ListingImageRouteProps) {
  const { key } = await params;
  const objectKey = key.join("/");
  const object = await getListingImageObject(objectKey);

  if (!object) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": object.contentType,
    },
  });
}
