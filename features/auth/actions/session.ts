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
import { hashPassword, verifyPassword } from "@/features/auth/services/password";
import { createUserSession } from "@/features/auth/services/session";
import {
  authCookieName,
  hashSessionToken,
  legacyAuthCookieName,
} from "@/features/auth/services/session-token";

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

const passwordSignInRateLimitWindowMs = 10 * 60 * 1000;
const passwordSignInRateLimitMax = 8;
const passwordSignInAttempts = new Map<string, number[]>();

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  return signInWithPassword(email, password);
}

export async function adminPasswordSignInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isAdminEmail(email)) {
    recordPasswordSignInAttempt(email);
    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  const result = await signInWithPassword(email, password);

  if (result.ok) {
    await createAdminSession(result.user.id);
  }

  return result;
}

async function signInWithPassword(email: string, password: string): Promise<SignInResult> {

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

  if (isPasswordSignInRateLimited(email)) {
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
    recordPasswordSignInAttempt(email);
    return {
      ok: false,
      error: "Аккаунт не найден. Зарегистрируйтесь с этим email.",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    recordPasswordSignInAttempt(email);
    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  await createUserSession(user.id);
  clearPasswordSignInAttempts(email);

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
}

export async function signUpAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || "Пользователь";
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Укажите корректный email.",
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      error: "Пароль должен быть не короче 8 символов.",
    };
  }

  const passwordHash = await hashPassword(password);
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      passwordHash: true,
      bannedAt: true,
    },
  });

  if (existingUser?.bannedAt) {
    return {
      ok: false,
      error: "Аккаунт заблокирован.",
    };
  }

  if (existingUser?.passwordHash) {
    return {
      ok: false,
      error: "Этот email уже зарегистрирован. Войдите с паролем.",
    };
  }

  const user = existingUser
    ? await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          name,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

  await createUserSession(user.id);

  return {
    ok: true,
    user,
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
      select: {
        id: true,
        name: true,
        email: true,
      },
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
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
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
    const user = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
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

function isPasswordSignInRateLimited(email: string) {
  const attempts = getRecentPasswordSignInAttempts(email);

  return attempts.length >= passwordSignInRateLimitMax;
}

function recordPasswordSignInAttempt(email: string) {
  passwordSignInAttempts.set(email, [...getRecentPasswordSignInAttempts(email), Date.now()]);
}

function clearPasswordSignInAttempts(email: string) {
  passwordSignInAttempts.delete(email);
}

function getRecentPasswordSignInAttempts(email: string) {
  const cutoff = Date.now() - passwordSignInRateLimitWindowMs;
  const attempts = passwordSignInAttempts.get(email)?.filter((timestamp) => timestamp >= cutoff) ?? [];

  if (attempts.length) {
    passwordSignInAttempts.set(email, attempts);
  } else {
    passwordSignInAttempts.delete(email);
  }

  return attempts;
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
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
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
