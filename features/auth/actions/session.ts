"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import type { CurrentUserModel } from "@/features/auth/services/current-user";
import { UserBannedError } from "@/features/auth/services/current-user";
import {
  clearAdminSession,
  createAdminSession,
} from "@/features/admin/services/admin-session";
import { isAdminEmail } from "@/features/admin/services/admin-auth";
import {
  completeEmailCodeSignUp,
  isValidEmail,
  normalizeEmail,
  normalizeEmailCode,
  requestEmailCode,
  verifyEmailCode,
} from "@/features/auth/services/email-code";
import { completeMagicLinkSignUp, requestMagicLink } from "@/features/auth/services/magic-link";
import { completeOAuthSignUp } from "@/features/auth/services/oauth";
import { hashPassword, verifyPassword } from "@/features/auth/services/password";
import { createUserSession } from "@/features/auth/services/session";
import {
  authCookieName,
  hashSessionToken,
  legacyAuthCookieName,
} from "@/features/auth/services/session-token";
import { checkRateLimit } from "@/services/rate-limit";
import {
  createPresignedListingImageUpload,
  deleteListingImages,
  isOwnedUploadedImageUrl,
} from "@/services/storage/s3-storage";

type SignInResult =
  | {
      ok: true;
      user: CurrentUserModel;
    }
  | {
      ok: false;
      error: string;
    };

type MagicLinkResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type EmailCodeRequestResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type EmailCodeVerifyResult =
  | {
      ok: true;
      kind: "sign-in";
      user: CurrentUserModel;
    }
  | {
      ok: true;
      kind: "sign-up";
      email: string;
    }
  | {
      ok: false;
      error: string;
    };

type ProfileImageUploadResult =
  | {
      ok: true;
      uploadUrl: string;
      imageUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

type UpdateProfileResult =
  | {
      ok: true;
      user: CurrentUserModel;
    }
  | {
      ok: false;
      error: string;
    };

type DeleteAccountResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

const passwordSignInRateLimitWindowMs = 10 * 60 * 1000;
const passwordSignInRateLimitMax = 8;
// Валидный по формату hash для выравнивания времени ответа, когда пользователь не найден.
const dummyPasswordHash = `scrypt:dummysalt:${Buffer.alloc(64).toString("base64url")}`;
const currentUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
} as const;

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  return signInWithPassword(email, password);
}

export async function adminPasswordSignInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isAdminEmail(email)) {
    await checkRateLimit({
      scope: "admin-password-sign-in",
      identifier: email,
      windowMs: passwordSignInRateLimitWindowMs,
      max: passwordSignInRateLimitMax,
    });
    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  const result = await verifyPasswordCredentials(email, password);

  if (result.ok) {
    await createAdminSession(result.user.id);
  }

  return result;
}

async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const result = await verifyPasswordCredentials(email, password);

  if (result.ok) {
    await createUserSession(result.user.id);
  }

  return result;
}

async function verifyPasswordCredentials(email: string, password: string): Promise<SignInResult> {
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Укажите корректный email.",
    };
  }

  if (!password) {
    return {
      ok: false,
      error: "Введите пароль.",
    };
  }

  const rateLimit = await checkRateLimit({
    scope: "password-sign-in",
    identifier: email,
    windowMs: passwordSignInRateLimitWindowMs,
    max: passwordSignInRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много попыток входа. Попробуйте позже.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      passwordHash: true,
      bannedAt: true,
    },
  });

  if (user?.bannedAt) {
    return {
      ok: false,
      error: "Аккаунт заблокирован.",
    };
  }

  if (!user?.passwordHash) {
    // Выравниваем время ответа и текст ошибки, чтобы не раскрывать,
    // существует ли аккаунт с таким email.
    await verifyPassword(password, dummyPasswordHash).catch(() => false);

    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function signOutAction() {
  await clearAdminSession();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authCookieName)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
    });
  }

  cookieStore.delete(authCookieName);
  cookieStore.delete(legacyAuthCookieName);
  revalidatePath("/");
}

export async function createProfileAvatarUploadAction(input: {
  contentType: string;
  size: number;
}): Promise<ProfileImageUploadResult> {
  const user = await getUserFromSessionToken();

  if (!user) {
    return {
      ok: false,
      error: "Сначала войдите в аккаунт.",
    };
  }

  const rateLimit = await checkRateLimit({
    scope: "profile-avatar-upload",
    identifier: user.id,
    windowMs: 10 * 60 * 1000,
    max: 12,
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
      folder: "profile-avatars",
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

    console.error("Failed to create profile avatar upload.", error);

    return {
      ok: false,
      error: "Не удалось подготовить загрузку фото. Попробуйте позже.",
    };
  }
}

export async function updateCurrentUserAvatarAction(imageUrl: string): Promise<UpdateProfileResult> {
  const user = await getUserFromSessionToken();

  if (!user) {
    return {
      ok: false,
      error: "Сначала войдите в аккаунт.",
    };
  }

  const trimmedImageUrl = imageUrl.trim();

  // Принимаем только URL из собственной presigned-загрузки пользователя,
  // иначе через deleteListingImages можно удалить чужой объект в S3.
  if (!isOwnedUploadedImageUrl(trimmedImageUrl, user.id, "profile-avatars")) {
    return {
      ok: false,
      error: "Не удалось сохранить фото профиля.",
    };
  }

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        avatarUrl: trimmedImageUrl,
      },
      select: currentUserSelect,
    });

    if (user.avatarUrl) {
      void deleteListingImages([user.avatarUrl], [trimmedImageUrl]).catch((error) => {
        console.error("Failed to delete previous avatar image.", error);
      });
    }

    revalidatePath("/");

    return {
      ok: true,
      user: updatedUser,
    };
  } catch (error) {
    console.error("Failed to update profile avatar.", error);

    return {
      ok: false,
      error: "Не удалось сохранить фото профиля. Попробуйте позже.",
    };
  }
}

export async function deleteCurrentAccountAction(): Promise<DeleteAccountResult> {
  await clearAdminSession();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authCookieName)?.value;

  if (!sessionToken) {
    return {
      ok: false,
      error: "Сначала войдите в аккаунт.",
    };
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    include: {
      user: {
        select: {
          id: true,
          avatarUrl: true,
          listings: {
            select: {
              images: {
                select: {
                  url: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return {
      ok: false,
      error: "Сначала войдите в аккаунт.",
    };
  }

  const imageUrls = [
    session.user.avatarUrl,
    ...session.user.listings.flatMap((listing) => listing.images.map((image) => image.url)),
  ].filter((imageUrl): imageUrl is string => Boolean(imageUrl));

  try {
    await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });

    cookieStore.delete(authCookieName);
    cookieStore.delete(legacyAuthCookieName);

    if (imageUrls.length) {
      void deleteListingImages(imageUrls).catch((error) => {
        console.error("Failed to delete account images.", error);
      });
    }

    revalidatePath("/");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to delete account.", error);

    return {
      ok: false,
      error: "Не удалось удалить аккаунт. Попробуйте позже.",
    };
  }
}

export async function requestMagicLinkAction(formData: FormData): Promise<MagicLinkResult> {
  const email = normalizeEmail(formData.get("email"));

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: "Укажите корректный email.",
    };
  }

  try {
    const result = await requestMagicLink(email);

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      message: "Если email указан верно, мы отправили одноразовую ссылку.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_PROVIDER_NOT_CONFIGURED") {
      return {
        ok: false,
        error: "Отправка писем пока не настроена.",
      };
    }

    console.error("Magic link request failed", {
      error: getSafeActionErrorMessage(error),
    });

    return {
      ok: false,
      error: "Не удалось отправить ссылку. Попробуйте позже.",
    };
  }
}

export async function requestEmailCodeAction(formData: FormData): Promise<EmailCodeRequestResult> {
  const email = normalizeEmail(formData.get("email"));

  if (!isValidEmail(email)) {
    return {
      ok: false,
      error: "Укажите корректный email.",
    };
  }

  try {
    const result = await requestEmailCode(email);

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      message: "Если email указан верно, мы отправили одноразовый код.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_PROVIDER_NOT_CONFIGURED") {
      return {
        ok: false,
        error: "Отправка писем пока не настроена.",
      };
    }

    console.error("Email code request failed", {
      error: getSafeActionErrorMessage(error),
    });

    return {
      ok: false,
      error: "Не удалось отправить код. Попробуйте позже.",
    };
  }
}

export async function verifyEmailCodeAction(formData: FormData): Promise<EmailCodeVerifyResult> {
  const email = normalizeEmail(formData.get("email"));
  const code = normalizeEmailCode(formData.get("code"));

  if (!isValidEmail(email) || code.length !== 6) {
    return {
      ok: false,
      error: "Введите код из 6 цифр.",
    };
  }

  try {
    const result = await verifyEmailCode(email, code);

    if (!result.ok) {
      return result;
    }

    if (result.kind === "sign-up") {
      return {
        ok: true,
        kind: "sign-up",
        email: result.email,
      };
    }

    const user = await prisma.user.findUnique({
      where: {
        id: result.userId,
      },
      select: currentUserSelect,
    });

    if (!user) {
      return {
        ok: false,
        error: "Аккаунт не найден.",
      };
    }

    await createUserSession(user.id);

    return {
      ok: true,
      kind: "sign-in",
      user,
    };
  } catch (error) {
    if (error instanceof UserBannedError) {
      return {
        ok: false,
        error: "Аккаунт заблокирован.",
      };
    }

    return {
      ok: false,
      error: "Не удалось проверить код. Попробуйте позже.",
    };
  }
}

export async function completeEmailCodeSignUpAction(formData: FormData): Promise<SignInResult> {
  const email = normalizeEmail(formData.get("email"));
  const code = normalizeEmailCode(formData.get("code"));
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const acceptedTerms = formData.get("termsAccepted") === "on";

  if (!acceptedTerms) {
    return {
      ok: false,
      error: "Подтвердите согласие с правилами.",
    };
  }

  if (!isValidEmail(email) || code.length !== 6) {
    return {
      ok: false,
      error: "Запросите новый код.",
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Укажите имя.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      error: "Имя слишком длинное.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: "Пароль должен быть не короче 8 символов.",
    };
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await completeEmailCodeSignUp(email, code, name, passwordHash);

    if (!result.ok) {
      return result;
    }

    await createUserSession(result.user.id);

    return {
      ok: true,
      user: result.user,
    };
  } catch {
    return {
      ok: false,
      error: "Не удалось завершить регистрацию. Запросите новый код.",
    };
  }
}

export async function setCurrentUserPasswordAction(formData: FormData): Promise<SignInResult> {
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) {
    return {
      ok: false,
      error: "Пароль должен быть не короче 8 символов.",
    };
  }

  try {
    const sessionToken = (await cookies()).get(authCookieName)?.value;

    if (!sessionToken) {
      return {
        ok: false,
        error: "Сначала войдите в аккаунт.",
      };
    }

    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(sessionToken),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            bannedAt: true,
          },
        },
      },
    });

    if (!session || session.expiresAt <= new Date() || session.user.bannedAt) {
      return {
        ok: false,
        error: "Сначала войдите в аккаунт.",
      };
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          passwordHash,
        },
        select: currentUserSelect,
      });

      // При смене пароля отзываем все остальные сессии пользователя.
      await tx.session.deleteMany({
        where: {
          userId: session.user.id,
          id: {
            not: session.id,
          },
        },
      });

      return updatedUser;
    });

    return {
      ok: true,
      user,
    };
  } catch {
    return {
      ok: false,
      error: "Не удалось сохранить пароль. Попробуйте позже.",
    };
  }
}

function getSafeActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 300);
  }

  return "Unknown magic link request error.";
}

export async function completeMagicLinkSignUpAction(formData: FormData): Promise<SignInResult> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const acceptedTerms = formData.get("termsAccepted") === "on";

  if (!acceptedTerms) {
    return {
      ok: false,
      error: "Подтвердите согласие с правилами.",
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Укажите имя.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      error: "Имя слишком длинное.",
    };
  }

  try {
    const result = await completeMagicLinkSignUp(token, name);

    if (!result.ok) {
      return result;
    }

    await createUserSession(result.user.id);

    return {
      ok: true,
      user: result.user,
    };
  } catch (error) {
    if (error instanceof UserBannedError) {
      return {
        ok: false,
        error: "Аккаунт заблокирован.",
      };
    }

    return {
      ok: false,
      error: "Не удалось завершить регистрацию. Запросите новую ссылку.",
    };
  }
}

export async function completeOAuthSignUpAction(formData: FormData): Promise<SignInResult> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim() || null;
  const acceptedTerms = formData.get("termsAccepted") === "on";

  if (!acceptedTerms) {
    return {
      ok: false,
      error: "Подтвердите согласие с правилами.",
    };
  }

  if (!name) {
    return {
      ok: false,
      error: "Укажите имя.",
    };
  }

  if (name.length > 80) {
    return {
      ok: false,
      error: "Имя слишком длинное.",
    };
  }

  try {
    const result = await completeOAuthSignUp(token, name, avatarUrl);

    if (!result.ok) {
      return result;
    }

    await createUserSession(result.user.id);

    return {
      ok: true,
      user: result.user,
    };
  } catch (error) {
    if (error instanceof UserBannedError) {
      return {
        ok: false,
        error: "Аккаунт заблокирован.",
      };
    }

    return {
      ok: false,
      error: "Не удалось завершить вход. Попробуйте ещё раз.",
    };
  }
}

async function getUserFromSessionToken(): Promise<CurrentUserModel | null> {
  const sessionToken = (await cookies()).get(authCookieName)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(sessionToken),
    },
    include: {
      user: {
        select: {
          ...currentUserSelect,
          bannedAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date() || session.user.bannedAt) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
  };
}

function isSafeUploadError(message: string) {
  return message.startsWith("Загрузите фото") ||
    message.startsWith("Размер одного фото") ||
    message.startsWith("Хранилище фото не настроено");
}
