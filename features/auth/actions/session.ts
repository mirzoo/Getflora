"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { prisma } from "@/db/prisma";
import { authCookieName, type CurrentUserModel } from "@/features/auth/services/current-user";

type SignInResult =
  | {
      ok: true;
      user: CurrentUserModel;
    }
  | {
      ok: false;
      error: string;
    };

const sessionMaxAgeSeconds = 60 * 60 * 24 * 365;

export async function signInAction(formData: FormData): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || "Пользователь";

  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Укажите корректный email.",
    };
  }

  const user = await prisma.user.upsert({
    where: {
      email,
    },
    update: {
      name,
    },
    create: {
      email,
      name,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(authCookieName, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });

  revalidatePath("/");

  return {
    ok: true,
    user,
  };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(authCookieName);
  revalidatePath("/");
}
