"use server";

import { revalidatePath } from "next/cache";

import {
  createSupportMessageForCurrentUser,
  createSupportMessageFromAdmin,
} from "@/features/support/services/support-repository";
import { getSessionUser } from "@/features/auth/services/current-user";
import { checkRateLimit } from "@/services/rate-limit";
import type { SupportConversationModel } from "@/types/support";

type SendSupportMessageResult =
  | {
      ok: true;
      conversation: SupportConversationModel;
    }
  | {
      ok: false;
      error: string;
    };

const maxSupportMessageLength = 1000;
const supportMessageRateLimitWindowMs = 10 * 60 * 1000;
const supportMessageRateLimitMax = 30;

export async function sendSupportMessageAction(
  formData: FormData,
): Promise<SendSupportMessageResult> {
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return {
      ok: false,
      error: "Введите текст сообщения.",
    };
  }

  if (body.length > maxSupportMessageLength) {
    return {
      ok: false,
      error: "Сообщение слишком длинное.",
    };
  }

  const user = await getSessionUser();

  if (!user) {
    return {
      ok: false,
      error: "Чтобы отправить сообщение, войдите в аккаунт.",
    };
  }

  const rateLimit = await checkRateLimit({
    scope: "support-message-send",
    identifier: user.id,
    windowMs: supportMessageRateLimitWindowMs,
    max: supportMessageRateLimitMax,
  });

  if (!rateLimit.ok) {
    return {
      ok: false,
      error: "Слишком много сообщений за короткое время. Попробуйте позже.",
    };
  }

  const conversation = await createSupportMessageForCurrentUser(body);

  revalidatePath("/");
  revalidatePath("/admin/support");

  return {
    ok: true,
    conversation,
  };
}

export async function sendAdminSupportMessageAction(
  formData: FormData,
): Promise<SendSupportMessageResult> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!conversationId || !body) {
    return {
      ok: false,
      error: "Введите текст сообщения.",
    };
  }

  if (body.length > maxSupportMessageLength) {
    return {
      ok: false,
      error: "Сообщение слишком длинное.",
    };
  }

  try {
    const conversation = await createSupportMessageFromAdmin(conversationId, body);

    revalidatePath("/");
    revalidatePath("/admin/support");

    return {
      ok: true,
      conversation,
    };
  } catch {
    return {
      ok: false,
      error: "Диалог не найден или у вас нет доступа.",
    };
  }
}
