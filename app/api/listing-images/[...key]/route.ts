import { NextResponse, type NextRequest } from "next/server";

import { getImageContentTypeForKey, getListingImageObject } from "@/services/storage/s3-storage";

type ListingImageRouteProps = {
  params: Promise<{
    key: string[];
  }>;
};

export async function GET(_request: NextRequest, { params }: ListingImageRouteProps) {
  const { key } = await params;
  const objectKey = key.join("/");
  // Content-Type определяем по расширению ключа, а не по метаданным объекта,
  // чтобы загруженный не-image контент не мог отрендериться как HTML/SVG.
  const contentType = getImageContentTypeForKey(objectKey);

  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const object = await getListingImageObject(objectKey);

  if (!object) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(object.body, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
