import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import {
  authCookieName,
  createSessionToken,
  getSessionExpiresAt,
  hashSessionToken,
  legacyAuthCookieName,
  sessionMaxAgeSeconds,
  shouldUseSecureCookie,
} from "@/features/auth/services/session-token";

export async function createUserSession(userId: string) {
  const token = await createUserSessionToken(userId);

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
  cookieStore.delete(legacyAuthCookieName);

  revalidatePath("/");
}

export async function createUserSessionToken(userId: string) {
  const token = createSessionToken();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: getSessionExpiresAt(),
    },
  });

  return token;
}
