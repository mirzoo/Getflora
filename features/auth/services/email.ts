const resendSendEmailUrl = "https://api.resend.com/emails";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

export async function sendTransactionalEmail({ to, subject, text }: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  }

  const response = await fetch(resendSendEmailUrl, {
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
    }),
  });

  if (!response.ok) {
    throw new Error("EMAIL_SEND_FAILED");
  }
}
