"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import type { CurrentUserModel } from "@/features/auth/services/current-user";
import { isValidEmail, normalizeEmail, requestMagicLink } from "@/features/auth/services/magic-link";
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

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

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

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return {
      ok: false,
      error: "Аккаунт не найден. Зарегистрируйтесь с этим email.",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      ok: false,
      error: "Неверный email или пароль.",
    };
  }

  await createUserSession(user.id);

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
    },
  });

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
      message: "Если аккаунт с таким email есть, мы отправили ссылку для входа.",
    };
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_PROVIDER_NOT_CONFIGURED") {
      return {
        ok: false,
        error: "Отправка писем пока не настроена.",
      };
    }

    return {
      ok: false,
      error: "Не удалось отправить ссылку. Попробуйте позже.",
    };
  }
}
