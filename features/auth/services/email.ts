const resendSendEmailUrl = "https://api.resend.com/emails";

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

  let response: Response;

  try {
    response = await fetch(resendSendEmailUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        ...(html ? { html } : {}),
      }),
    });
  } catch (error) {
    console.error("Email provider request failed before response", {
      error: getSafeErrorMessage(error),
    });

    throw new Error("EMAIL_SEND_FAILED");
  }

  if (!response.ok) {
    const providerError = await readProviderError(response);
    console.error("Email provider request failed", {
      status: response.status,
      error: providerError,
    });

    throw new Error("EMAIL_SEND_FAILED");
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
