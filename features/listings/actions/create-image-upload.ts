"use server";

import { requireCurrentUser } from "@/features/auth/services/current-user";
import { createPresignedListingImageUpload } from "@/services/storage/s3-storage";
import { checkRateLimit } from "@/services/rate-limit";

type CreateImageUploadResult =
  | {
      ok: true;
      uploadUrl: string;
      imageUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

const uploadRateLimitWindowMs = 10 * 60 * 1000;
const uploadRateLimitMax = 40;

export async function createListingImageUploadAction(input: {
  contentType: string;
  size: number;
}): Promise<CreateImageUploadResult> {
  let user: Awaited<ReturnType<typeof requireCurrentUser>>;

  try {
    user = await requireCurrentUser();
  } catch {
    return {
      ok: false,
      error: "Чтобы загрузить фото, сначала войдите в аккаунт.",
    };
  }

  const rateLimit = await checkRateLimit({
    scope: "listing-image-upload",
    identifier: user.id,
    windowMs: uploadRateLimitWindowMs,
    max: uploadRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много загрузок фото за короткое время. Попробуйте позже.",
    };
  }

  try {
    const upload = createPresignedListingImageUpload({
      contentType: input.contentType,
      size: input.size,
      ownerId: user.id,
    });

    return {
      ok: true,
      uploadUrl: upload.uploadUrl,
      imageUrl: upload.imageUrl,
    };
  } catch (error) {
    if (error instanceof Error && isSafeUploadError(error.message)) {
      return {
        ok: false,
        error: error.message,
      };
    }

    console.error("Failed to create listing image upload.", error);

    return {
      ok: false,
      error: "Не удалось подготовить загрузку фото. Попробуйте позже.",
    };
  }
}

function isSafeUploadError(message: string) {
  return message.startsWith("Загрузите фото") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Хранилище фото не настроено");
}
