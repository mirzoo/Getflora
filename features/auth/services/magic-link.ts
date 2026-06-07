import { randomBytes } from "crypto";

import { prisma } from "@/db/prisma";
import { assertEmailCanSignIn } from "@/features/auth/services/current-user";
import { hashSessionToken } from "@/features/auth/services/session-token";
import { sendTransactionalEmail } from "@/features/auth/services/email";
import { buildMagicLinkEmail } from "@/features/auth/services/email-templates";

const magicLinkTtlMinutes = 15;
const magicLinkRateLimitWindowMinutes = 10;
const magicLinkRateLimitMax = 3;

export function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function requestMagicLink(email: string) {
  const windowStart = new Date(Date.now() - magicLinkRateLimitWindowMinutes * 60 * 1000);
  const recentTokenCount = await prisma.magicLinkToken.count({
    where: {
      email,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (recentTokenCount >= magicLinkRateLimitMax) {
    return {
      ok: false as const,
      error: "Слишком много запросов. Попробуйте позже.",
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + magicLinkTtlMinutes * 60 * 1000);

  const magicLinkToken = await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const magicLink = `${getAppUrl()}/auth/magic?token=${encodeURIComponent(token)}`;
  const emailContent = buildMagicLinkEmail({
    magicLink,
    ttlMinutes: magicLinkTtlMinutes,
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
        id: magicLinkToken.id,
        consumedAt: null,
      },
    });

    throw error;
  }

  return {
    ok: true as const,
  };
}

type ConsumeMagicLinkResult =
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

export async function consumeMagicLink(token: string): Promise<ConsumeMagicLinkResult> {
  const magicLinkToken = await findValidMagicLinkToken(token);

  if (!magicLinkToken) {
    return {
      ok: false,
      error: "Ссылка для входа истекла или уже использована.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: magicLinkToken.email,
    },
    select: {
      id: true,
    },
  });

  if (user) {
    try {
      await assertEmailCanSignIn(magicLinkToken.email);
    } catch {
      return {
        ok: false,
        error: "Аккаунт заблокирован.",
      };
    }

    const consumedToken = await prisma.magicLinkToken.updateMany({
      where: {
        id: magicLinkToken.id,
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
        error: "Ссылка для входа истекла или уже использована.",
      };
    }

    return {
      ok: true,
      kind: "sign-in",
      userId: user.id,
    };
  }

  return {
    ok: true,
    kind: "sign-up",
    email: magicLinkToken.email,
  };
}

export async function getMagicLinkSignUpContext(token: string) {
  const magicLinkToken = await findValidMagicLinkToken(token);

  if (!magicLinkToken) {
    return {
      ok: false as const,
      error: "Ссылка для регистрации истекла или уже использована.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: magicLinkToken.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      ok: false as const,
      error: "Аккаунт уже создан. Запросите новую ссылку для входа.",
    };
  }

  return {
    ok: true as const,
    email: magicLinkToken.email,
  };
}

export async function completeMagicLinkSignUp(token: string, name: string) {
  const trimmedName = name.trim() || "Пользователь";
  const magicLinkToken = await findValidMagicLinkToken(token);

  if (!magicLinkToken) {
    return {
      ok: false as const,
      error: "Ссылка для регистрации истекла или уже использована.",
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: magicLinkToken.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return {
      ok: false as const,
      error: "Аккаунт уже создан. Запросите новую ссылку для входа.",
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const consumedToken = await tx.magicLinkToken.updateMany({
      where: {
        id: magicLinkToken.id,
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
        email: magicLinkToken.email,
        name: trimmedName,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  });

  if (!result) {
    return {
      ok: false as const,
      error: "Ссылка для регистрации истекла или уже использована.",
    };
  }

  return {
    ok: true as const,
    user: result,
  };
}

async function findValidMagicLinkToken(token: string) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!magicLinkToken || magicLinkToken.consumedAt || magicLinkToken.expiresAt <= new Date()) {
    return null;
  }

  return magicLinkToken;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
