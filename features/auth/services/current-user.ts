import { prisma } from "@/db/prisma";
import { cookies } from "next/headers";
import { authCookieName, hashSessionToken } from "@/features/auth/services/session-token";

export type CurrentUserModel = {
  id: string;
  name: string;
  email: string | null;
};

export class UserBannedError extends Error {
  constructor() {
    super("USER_BANNED");
    this.name = "UserBannedError";
  }
}

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
          bannedAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  if (session.user.bannedAt) {
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
      },
    });
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function findCurrentUserById(userId: string): Promise<CurrentUserModel | null> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      bannedAt: true,
    },
  });

  if (!user || user.bannedAt) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

export async function requireCurrentUser() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    throw new Error("AUTH_REQUIRED");
  }

  return sessionUser;
}

export async function assertUserCanSignIn(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      bannedAt: true,
    },
  });

  if (user?.bannedAt) {
    throw new UserBannedError();
  }
}

export async function assertEmailCanSignIn(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      bannedAt: true,
    },
  });

  if (user?.bannedAt) {
    throw new UserBannedError();
  }
}
