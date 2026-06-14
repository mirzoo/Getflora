import { randomBytes } from "crypto";

import { prisma } from "@/db/prisma";
import { UserBannedError, assertEmailCanSignIn } from "@/features/auth/services/current-user";
import { hashSessionToken } from "@/features/auth/services/session-token";
import { buildAppUrl } from "@/lib/app-url";

export type OAuthProviderSlug = "google" | "yandex";

type OAuthProviderDb = "GOOGLE" | "YANDEX";

type OAuthProfile = {
  provider: OAuthProviderDb;
  providerAccountId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scope: string;
};

const oauthSignUpTtlMinutes = 15;

export const oauthStateCookiePrefix = "getflora_oauth_state_";
export const oauthStateCookieMaxAgeSeconds = 10 * 60;

export function getOAuthProviderSlug(value: string): OAuthProviderSlug | null {
  return value === "google" || value === "yandex" ? value : null;
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function createOAuthNonce() {
  return randomBytes(32).toString("base64url");
}

export function getOAuthStateCookieName(provider: OAuthProviderSlug) {
  return `${oauthStateCookiePrefix}${provider}`;
}

export function buildOAuthAuthorizationUrl(provider: OAuthProviderSlug, state: string, nonce: string) {
  const config = getOAuthConfig(provider);
  const url = new URL(config.authorizationEndpoint);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", getOAuthRedirectUri(provider));
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("prompt", "select_account");
  }

  return url;
}

export async function consumeOAuthCallback(provider: OAuthProviderSlug, code: string, nonce: string) {
  const profile = await getOAuthProfile(provider, code, nonce);

  if (!profile.email) {
    return {
      ok: false as const,
      error: "Провайдер не передал email. Попробуйте другой способ входа.",
    };
  }

  const linkedAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          bannedAt: true,
        },
      },
    },
  });

  if (linkedAccount) {
    if (linkedAccount.user.bannedAt) {
      return {
        ok: false as const,
        error: "Аккаунт заблокирован.",
      };
    }

    if (linkedAccount.email !== profile.email) {
      await prisma.oAuthAccount.update({
        where: {
          id: linkedAccount.id,
        },
        data: {
          email: profile.email,
        },
      });
    }

    return {
      ok: true as const,
      kind: "sign-in" as const,
      userId: linkedAccount.userId,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: profile.email,
    },
    select: {
      id: true,
      bannedAt: true,
    },
  });

  if (existingUser) {
    if (existingUser.bannedAt) {
      return {
        ok: false as const,
        error: "Аккаунт заблокирован.",
      };
    }

    await prisma.oAuthAccount.create({
      data: {
        userId: existingUser.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        email: profile.email,
      },
    });

    return {
      ok: true as const,
      kind: "sign-in" as const,
      userId: existingUser.id,
    };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + oauthSignUpTtlMinutes * 60 * 1000);

  await prisma.oAuthSignUpToken.create({
    data: {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  return {
    ok: true as const,
    kind: "sign-up" as const,
    token,
  };
}

export async function getOAuthSignUpContext(token: string) {
  const signUpToken = await findValidOAuthSignUpToken(token);

  if (!signUpToken) {
    return {
      ok: false as const,
      error: "Ссылка для завершения входа истекла или уже использована.",
    };
  }

  return {
    ok: true as const,
    email: signUpToken.email,
    name: signUpToken.name ?? "",
    avatarUrl: signUpToken.avatarUrl,
  };
}

export async function completeOAuthSignUp(token: string, name: string, avatarUrl: string | null) {
  const trimmedName = name.trim();
  const signUpToken = await findValidOAuthSignUpToken(token);

  if (!signUpToken) {
    return {
      ok: false as const,
      error: "Сессия регистрации истекла. Попробуйте войти ещё раз.",
    };
  }

  const safeAvatarUrl = normalizeAvatarUrl(avatarUrl);

  const user = await prisma.$transaction(async (tx) => {
    const consumedToken = await tx.oAuthSignUpToken.updateMany({
      where: {
        id: signUpToken.id,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        consumedAt: new Date(),
      },
    });

    if (consumedToken.count !== 1) {
      return null;
    }

    const existingUser = await tx.user.findUnique({
      where: {
        email: signUpToken.email,
      },
      select: {
        id: true,
        bannedAt: true,
      },
    });

    if (existingUser?.bannedAt) {
      throw new UserBannedError();
    }

    const userId =
      existingUser?.id ??
      (
        await tx.user.create({
          data: {
            email: signUpToken.email,
            emailVerifiedAt: new Date(),
            name: trimmedName || signUpToken.name || "Пользователь",
            avatarUrl: safeAvatarUrl,
          },
          select: {
            id: true,
          },
        })
      ).id;

    await tx.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: signUpToken.provider,
          providerAccountId: signUpToken.providerAccountId,
        },
      },
      create: {
        userId,
        provider: signUpToken.provider,
        providerAccountId: signUpToken.providerAccountId,
        email: signUpToken.email,
      },
      update: {
        userId,
        email: signUpToken.email,
      },
    });

    return tx.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });
  });

  if (!user) {
    return {
      ok: false as const,
      error: "Сессия регистрации истекла. Попробуйте войти ещё раз.",
    };
  }

  await assertEmailCanSignIn(signUpToken.email);

  return {
    ok: true as const,
    user,
  };
}

function getOAuthConfig(provider: OAuthProviderSlug): OAuthConfig {
  if (provider === "google") {
    return {
      clientId: getRequiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
      clientSecret: getRequiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
    };
  }

  return {
    clientId: getRequiredEnv("YANDEX_OAUTH_CLIENT_ID"),
    clientSecret: getRequiredEnv("YANDEX_OAUTH_CLIENT_SECRET"),
    authorizationEndpoint: "https://oauth.yandex.com/authorize",
    tokenEndpoint: "https://oauth.yandex.com/token",
    scope: "login:email,login:info,login:avatar",
  };
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function getOAuthRedirectUri(provider: OAuthProviderSlug) {
  return buildAppUrl(`/auth/oauth/${provider}/callback`).toString();
}

async function getOAuthProfile(provider: OAuthProviderSlug, code: string, nonce: string): Promise<OAuthProfile> {
  const config = getOAuthConfig(provider);
  const tokenResponse = await exchangeAuthorizationCode(provider, config, code);

  return provider === "google"
    ? getGoogleProfile(config, tokenResponse, nonce)
    : getYandexProfile(tokenResponse);
}

async function exchangeAuthorizationCode(provider: OAuthProviderSlug, config: OAuthConfig, code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  if (provider === "google") {
    body.set("redirect_uri", getOAuthRedirectUri(provider));
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(payload)) {
    throw new Error("OAuth token exchange failed");
  }

  return payload;
}

function getGoogleProfile(config: OAuthConfig, tokenResponse: Record<string, unknown>, nonce: string): OAuthProfile {
  const idToken = typeof tokenResponse.id_token === "string" ? tokenResponse.id_token : "";
  const payload = decodeJwtPayload(idToken);

  if (!payload) {
    throw new Error("Google ID token is invalid");
  }

  const providerAccountId = getStringClaim(payload, "sub");
  const email = getStringClaim(payload, "email").toLowerCase();
  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  const audience = getStringClaim(payload, "aud");
  const issuer = getStringClaim(payload, "iss");
  const expiresAt = getNumberClaim(payload, "exp");
  const tokenNonce = getStringClaim(payload, "nonce");

  if (
    !providerAccountId ||
    !email ||
    !emailVerified ||
    audience !== config.clientId ||
    (issuer !== "https://accounts.google.com" && issuer !== "accounts.google.com") ||
    !expiresAt ||
    expiresAt <= Math.floor(Date.now() / 1000) ||
    tokenNonce !== nonce
  ) {
    throw new Error("Google ID token validation failed");
  }

  return {
    provider: "GOOGLE",
    providerAccountId,
    email,
    name: getStringClaim(payload, "name") || getStringClaim(payload, "given_name") || null,
    avatarUrl: normalizeAvatarUrl(getStringClaim(payload, "picture")),
  };
}

async function getYandexProfile(tokenResponse: Record<string, unknown>): Promise<OAuthProfile> {
  const accessToken = typeof tokenResponse.access_token === "string" ? tokenResponse.access_token : "";

  if (!accessToken) {
    throw new Error("Yandex access token is missing");
  }

  const response = await fetch("https://login.yandex.ru/info?format=json", {
    headers: {
      Authorization: `OAuth ${accessToken}`,
    },
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok || !isRecord(payload)) {
    throw new Error("Yandex userinfo request failed");
  }

  const providerAccountId = getStringClaim(payload, "id");
  const email = getStringClaim(payload, "default_email").toLowerCase();
  const avatarId = getStringClaim(payload, "default_avatar_id");

  if (!providerAccountId || !email) {
    throw new Error("Yandex userinfo is incomplete");
  }

  return {
    provider: "YANDEX",
    providerAccountId,
    email,
    name:
      getStringClaim(payload, "display_name") ||
      getStringClaim(payload, "real_name") ||
      getStringClaim(payload, "first_name") ||
      null,
    avatarUrl: avatarId ? `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200` : null,
  };
}

async function findValidOAuthSignUpToken(token: string) {
  if (!token) {
    return null;
  }

  const signUpToken = await prisma.oAuthSignUpToken.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });

  if (!signUpToken || signUpToken.consumedAt || signUpToken.expiresAt <= new Date()) {
    return null;
  }

  return signUpToken;
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replaceAll("-", "+").replaceAll("_", "/");
    const decoded = JSON.parse(Buffer.from(normalizedPayload, "base64").toString("utf8")) as unknown;

    return isRecord(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStringClaim(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  return typeof value === "string" ? value.trim() : "";
}

function getNumberClaim(payload: Record<string, unknown>, key: string) {
  const value = payload[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeAvatarUrl(value: string | null) {
  if (!value || value.length > 2048) {
    return null;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
