import { randomInt } from "crypto";

import { prisma } from "@/db/prisma";
import { assertEmailCanSignIn } from "@/features/auth/services/current-user";
import { sendTransactionalEmail } from "@/features/auth/services/email";
import { buildEmailCodeEmail } from "@/features/auth/services/email-templates";
import { hashSessionToken } from "@/features/auth/services/session-token";
import { checkRateLimit } from "@/services/rate-limit";

const emailCodeTtlMinutes = 10;
const emailCodeRateLimitWindowMinutes = 10;
const emailCodeRateLimitMax = 3;
const emailCodeMaxAttempts = 5;

export function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmailCode(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

export async function requestEmailCode(email: string) {
  const rateLimit = await checkRateLimit({
    scope: "email-code-request",
    identifier: email,
    windowMs: emailCodeRateLimitWindowMinutes * 60 * 1000,
    max: emailCodeRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false as const,
      error: "Слишком много запросов. Попробуйте позже.",
    };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + emailCodeTtlMinutes * 60 * 1000);

  const emailCodeToken = await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash: getEmailCodeHash(email, code),
      expiresAt,
    },
  });

  const emailContent = buildEmailCodeEmail({
    code,
    ttlMinutes: emailCodeTtlMinutes,
  });

  try {
    await sendTransactionalEmail({
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });
  } catch (error) {
    await prisma.magicLinkToken.deleteMany({
      where: {
        id: emailCodeToken.id,
        consumedAt: null,
      },
    });

    throw error;
  }

  return {
    ok: true as const,
  };
}

type VerifyEmailCodeResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      kind: "sign-in";
      userId: string;
    }
  | {
      ok: true;
      kind: "sign-up";
      email: string;
    };

export async function verifyEmailCode(email: string, code: string): Promise<VerifyEmailCodeResult> {
  const rateLimit = await checkRateLimit({
    scope: "email-code-verify",
    identifier: email,
    windowMs: emailCodeTtlMinutes * 60 * 1000,
    max: emailCodeMaxAttempts,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много попыток. Запросите новый код.",
    };
  }

  const emailCodeToken = await findValidEmailCodeToken(email, code);

  if (!emailCodeToken) {
    return {
      ok: false,
      error: "Неверный или устаревший код.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    return {
      ok: true,
      kind: "sign-up",
      email,
    };
  }

  try {
    await assertEmailCanSignIn(email);
  } catch {
    return {
      ok: false,
      error: "Аккаунт заблокирован.",
    };
  }

  const consumedToken = await prisma.magicLinkToken.updateMany({
    where: {
      id: emailCodeToken.id,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      consumedAt: new Date(),
    },
  });

  if (consumedToken.count !== 1) {
    return {
      ok: false,
      error: "Неверный или устаревший код.",
    };
  }

  return {
    ok: true,
    kind: "sign-in",
    userId: user.id,
  };
}

export async function completeEmailCodeSignUp(
  email: string,
  code: string,
  name: string,
  passwordHash: string,
) {
  const trimmedName = name.trim() || "Пользователь";
  const emailCodeToken = await findValidEmailCodeToken(email, code);

  if (!emailCodeToken) {
    return {
      ok: false as const,
      error: "Неверный или устаревший код.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      ok: false as const,
      error: "Аккаунт уже создан. Войдите с этим email.",
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const consumedToken = await tx.magicLinkToken.updateMany({
      where: {
        id: emailCodeToken.id,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        consumedAt: new Date(),
      },
    });

    if (consumedToken.count !== 1) {
      return null;
    }

    return tx.user.create({
      data: {
        email,
        emailVerifiedAt: new Date(),
        name: trimmedName,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });
  });

  if (!result) {
    return {
      ok: false as const,
      error: "Неверный или устаревший код.",
    };
  }

  return {
    ok: true as const,
    user: result,
  };
}

function getEmailCodeHash(email: string, code: string) {
  return hashSessionToken(`${email}:${code}`);
}

async function findValidEmailCodeToken(email: string, code: string) {
  if (!isValidEmail(email) || code.length !== 6) {
    return null;
  }

  const emailCodeToken = await prisma.magicLinkToken.findUnique({
    where: {
      tokenHash: getEmailCodeHash(email, code),
    },
  });

  if (!emailCodeToken || emailCodeToken.email !== email || emailCodeToken.consumedAt || emailCodeToken.expiresAt <= new Date()) {
    return null;
  }

  return emailCodeToken;
}
