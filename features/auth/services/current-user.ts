import { prisma } from "@/db/prisma";
import { cookies } from "next/headers";

export const authCookieName = "rebloom_user_id";

export type CurrentUserModel = {
  id: string;
  name: string;
  email: string | null;
};

export async function getSessionUser(): Promise<CurrentUserModel | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(authCookieName)?.value;

  if (!userId) {
    return null;
  }

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
