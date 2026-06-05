import { createHash, randomBytes } from "crypto";

export const authCookieName = "rebloom_session";
export const legacyAuthCookieName = "rebloom_user_id";
export const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt() {
  return new Date(Date.now() + sessionMaxAgeSeconds * 1000);
}

export function shouldUseSecureCookie() {
  return process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
}
