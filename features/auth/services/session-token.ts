import { createHash, randomBytes } from "crypto";

export const authCookieName = "getflora_session";
export const legacyAuthCookieName = "getflora_user_id";
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
  // В production cookie всегда Secure, даже если NEXT_PUBLIC_APP_URL
  // указан неверно (например, http:// за reverse proxy).
  if (process.env.NODE_ENV === "production") {
    return true;
  }

  return process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false;
}
