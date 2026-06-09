import { prisma } from "@/db/prisma";

type RateLimitInput = {
  scope: string;
  identifier: string;
  windowMs: number;
  max: number;
};

const cleanupWindowMs = 24 * 60 * 60 * 1000;

export async function checkRateLimit(input: RateLimitInput) {
  const identifier = normalizeIdentifier(input.identifier);

  if (!identifier) {
    return {
      ok: false as const,
      retryAfterMs: input.windowMs,
    };
  }

  const windowStart = new Date(Date.now() - input.windowMs);
  const currentCount = await prisma.rateLimitEvent.count({
    where: {
      scope: input.scope,
      identifier,
      createdAt: {
        gte: windowStart,
      },
    },
  });

  if (currentCount >= input.max) {
    const oldestEvent = await prisma.rateLimitEvent.findFirst({
      where: {
        scope: input.scope,
        identifier,
        createdAt: {
          gte: windowStart,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        createdAt: true,
      },
    });

    const retryAfterMs = oldestEvent
      ? Math.max(1000, input.windowMs - (Date.now() - oldestEvent.createdAt.getTime()))
      : input.windowMs;

    return {
      ok: false as const,
      retryAfterMs,
    };
  }

  await prisma.rateLimitEvent.create({
    data: {
      scope: input.scope,
      identifier,
    },
  });

  void cleanupOldRateLimitEvents();

  return {
    ok: true as const,
  };
}

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

async function cleanupOldRateLimitEvents() {
  try {
    await prisma.rateLimitEvent.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - cleanupWindowMs),
        },
      },
    });
  } catch (error) {
    console.warn("Failed to cleanup old rate limit events.", error);
  }
}
