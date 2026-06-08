"use server";

import { redirect } from "next/navigation";

import { clearAdminSession } from "@/features/admin/services/admin-session";

export async function signOutAdminAction() {
  await clearAdminSession();
  redirect("/");
}
