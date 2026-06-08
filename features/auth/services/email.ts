import { setDefaultResultOrder } from "node:dns";
import nodemailer from "nodemailer";

const defaultSmtpPort = 465;
const smtpTimeoutMs = 12_000;

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
  const config = getSmtpConfig();

  if (!config) {
    throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: smtpTimeoutMs,
    greetingTimeout: smtpTimeoutMs,
    socketTimeout: smtpTimeoutMs,
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    });
  } catch (error) {
    console.error("Email provider request failed", {
      error: getSafeErrorMessage(error),
    });

    throw new Error("EMAIL_SEND_FAILED");
  } finally {
    transporter.close();
  }
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.AUTH_EMAIL_FROM;
  const port = parseSmtpPort(process.env.SMTP_PORT);

  if (!host || !user || !password || !from || !port) {
    return null;
  }

  return {
    host,
    user,
    password,
    from,
    port,
    secure: port === 465,
  };
}

function parseSmtpPort(value: string | undefined) {
  if (!value) {
    return defaultSmtpPort;
  }

  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 300);
  }

  return "Unknown email provider request error.";
}
