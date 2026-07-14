import { prisma } from "@/db/prisma";

type RateLimitInput = {
  scope: string;
  identifier: string;
  windowMs: number;
  max: number;
};

const cleanupWindowMs = 24 * 60 * 60 * 1000;

type RateLimitResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      retryAfterMs: number;
    };

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const identifier = normalizeIdentifier(input.identifier);

  if (!identifier) {
    return {
      ok: false,
      retryAfterMs: input.windowMs,
    };
  }

  const windowStart = new Date(Date.now() - input.windowMs);
  const lockKey = `rate-limit:${input.scope}:${identifier}`;

  const result = await prisma.$transaction(async (tx): Promise<RateLimitResult> => {
    // Advisory lock сериализует параллельные проверки одного ключа,
    // иначе count + create позволяют превысить лимит гонкой запросов.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

    const currentCount = await tx.rateLimitEvent.count({
      where: {
        scope: input.scope,
        identifier,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (currentCount >= input.max) {
      const oldestEvent = await tx.rateLimitEvent.findFirst({
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
        ok: false,
        retryAfterMs,
      };
    }

    await tx.rateLimitEvent.create({
      data: {
        scope: input.scope,
        identifier,
      },
    });

    return {
      ok: true,
    };
  });

  if (result.ok) {
    void cleanupOldRateLimitEvents();
  }

  return result;
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
