import { randomBytes } from "crypto";

import { prisma } from "@/db/prisma";
import { hashSessionToken } from "@/features/auth/services/session-token";
import { sendTransactionalEmail } from "@/features/auth/services/email";

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

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user?.email) {
    return {
      ok: true as const,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + magicLinkTtlMinutes * 60 * 1000);

  await prisma.magicLinkToken.create({
    data: {
      email,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const magicLink = `${getAppUrl()}/auth/magic?token=${encodeURIComponent(token)}`;

  await sendTransactionalEmail({
    to: user.email,
    subject: "Вход в Getflora",
    text: [
      "Здравствуйте!",
      "",
      "Перейдите по ссылке, чтобы войти в Getflora:",
      magicLink,
      "",
      `Ссылка действует ${magicLinkTtlMinutes} минут и может быть использована один раз.`,
      "Если вы не запрашивали вход, просто проигнорируйте это письмо.",
    ].join("\n"),
  });

  return {
    ok: true as const,
  };
}

export async function consumeMagicLink(token: string) {
  if (!token) {
    return {
      ok: false as const,
      error: "Ссылка для входа некорректна.",
    };
  }

  const tokenHash = hashSessionToken(token);
  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!magicLinkToken || magicLinkToken.consumedAt || magicLinkToken.expiresAt <= new Date()) {
    return {
      ok: false as const,
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

  if (!user) {
    return {
      ok: false as const,
      error: "Аккаунт не найден.",
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
      ok: false as const,
      error: "Ссылка для входа истекла или уже использована.",
    };
  }

  return {
    ok: true as const,
    userId: user.id,
  };
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
