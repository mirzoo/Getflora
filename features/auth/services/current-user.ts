import { prisma } from "@/db/prisma";
import { cookies } from "next/headers";
import { authCookieName, hashSessionToken } from "@/features/auth/services/session-token";

export type CurrentUserModel = {
  id: string;
  name: string;
  email: string | null;
};

export async function getSessionUser(): Promise<CurrentUserModel | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(authCookieName)?.value;

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
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.user;
}

export async function findCurrentUserById(userId: string): Promise<CurrentUserModel | null> {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export async function requireCurrentUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    throw new Error("AUTH_REQUIRED");
  }

  return sessionUser;
}
