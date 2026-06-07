import { setDefaultResultOrder } from "node:dns";

const resendSendEmailUrl = "https://api.resend.com/emails";
const emailRequestTimeoutMs = 12_000;
const emailRequestMaxAttempts = 2;

try {
  setDefaultResultOrder("ipv4first");
} catch {
  // Best effort: older runtimes may not support changing DNS result order.
}

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendTransactionalEmail({ to, subject, text, html }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  }

  const requestBody = JSON.stringify({
    from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  const response = await sendEmailProviderRequestWithRetry(apiKey, requestBody);

  if (!response.ok) {
    const providerError = await readProviderError(response);
    console.error("Email provider request failed", {
      status: response.status,
      error: providerError,
    });

    throw new Error("EMAIL_SEND_FAILED");
  }
}

async function sendEmailProviderRequestWithRetry(apiKey: string, body: string) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= emailRequestMaxAttempts; attempt += 1) {
    try {
      return await sendEmailProviderRequest(apiKey, body);
    } catch (error) {
      lastError = error;
      console.error("Email provider request failed before response", {
        attempt,
        error: getSafeErrorMessage(error),
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error("EMAIL_SEND_FAILED");
}

async function sendEmailProviderRequest(apiKey: string, body: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), emailRequestTimeoutMs);

  try {
    return await fetch(resendSendEmailUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readProviderError(response: Response) {
  try {
    const body = await response.json();

    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
      return body.message.slice(0, 300);
    }
  } catch {
    return "Unable to parse provider error response.";
  }

  return "Provider returned an error without a message.";
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 300);
  }

  return "Unknown email provider request error.";
}
