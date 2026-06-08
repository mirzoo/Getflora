import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import {
  createSessionToken,
  hashSessionToken,
  shouldUseSecureCookie,
} from "@/features/auth/services/session-token";

export const adminCookieName = "getflora_admin_session";
const adminSessionMaxAgeSeconds = 60 * 60 * 12;

export async function createAdminSession(userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + adminSessionMaxAgeSeconds * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: adminSessionMaxAgeSeconds,
  });
}

export async function getAdminSessionUserId() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(adminCookieName)?.value;

  if (!adminToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(adminToken),
    },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.userId;
}

export async function hasValidAdminSession(userId: string) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(adminCookieName)?.value;

  if (!adminToken) {
    return false;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashSessionToken(adminToken),
    },
    select: {
      userId: true,
      expiresAt: true,
    },
  });

  return Boolean(session && session.userId === userId && session.expiresAt > new Date());
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(adminCookieName)?.value;

  if (adminToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(adminToken),
      },
    });
  }

  cookieStore.delete(adminCookieName);
}
