"use client";

import { createListingImageUploadAction } from "@/features/listings/actions/create-image-upload";

export async function uploadImagesDirectly(files: File[]) {
  const uploadedImageUrls: string[] = [];

  for (const file of files) {
    const upload = await createListingImageUploadAction({
      contentType: file.type,
      size: file.size,
    });

    if (!upload.ok) {
      throw new Error(upload.error);
    }

    const response = await fetch(upload.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Не удалось загрузить фото в хранилище. Попробуйте позже.");
    }

    uploadedImageUrls.push(upload.imageUrl);
  }

  return uploadedImageUrls;
}
