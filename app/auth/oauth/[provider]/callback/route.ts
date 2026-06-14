import { NextResponse, type NextRequest } from "next/server";

import {
  consumeOAuthCallback,
  getOAuthProviderSlug,
  getOAuthStateCookieName,
} from "@/features/auth/services/oauth";
import { createUserSessionToken } from "@/features/auth/services/session";
import {
  authCookieName,
  legacyAuthCookieName,
  sessionMaxAgeSeconds,
  shouldUseSecureCookie,
} from "@/features/auth/services/session-token";
import { buildAppUrl } from "@/lib/app-url";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  const provider = getOAuthProviderSlug(providerParam);

  if (!provider) {
    return new NextResponse("Unknown OAuth provider", { status: 404 });
  }

  const stateCookieName = getOAuthStateCookieName(provider);
  const [expectedState, nonce] = (request.cookies.get(stateCookieName)?.value ?? "").split(".");
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return renderOAuthErrorResponse("Вход был отменён или провайдер вернул ошибку.", stateCookieName);
  }

  if (!code || !state || state !== expectedState || !nonce) {
    return renderOAuthErrorResponse("Не удалось подтвердить безопасность входа. Попробуйте ещё раз.", stateCookieName);
  }

  try {
    const result = await consumeOAuthCallback(provider, code, nonce);

    if (!result.ok) {
      return renderOAuthErrorResponse(result.error, stateCookieName);
    }

    if (result.kind === "sign-up") {
      const completeUrl = buildAppUrl("/auth/oauth/complete");
      completeUrl.searchParams.set("token", result.token);
      const response = NextResponse.redirect(completeUrl);
      response.cookies.delete(stateCookieName);
      return response;
    }

    const sessionToken = await createUserSessionToken(result.userId);
    const response = NextResponse.redirect(buildAppUrl("/?account=1"));

    response.cookies.set(authCookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(),
      path: "/",
      maxAge: sessionMaxAgeSeconds,
    });
    response.cookies.delete(legacyAuthCookieName);
    response.cookies.delete(stateCookieName);

    return response;
  } catch (error) {
    console.error("OAuth callback failed", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return renderOAuthErrorResponse("Не удалось войти через этот сервис. Попробуйте другой способ.", stateCookieName);
  }
}

function renderOAuthErrorResponse(error: string, stateCookieName: string) {
  const response = new NextResponse(renderOAuthErrorPage(error), {
    status: 400,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
  response.cookies.delete(stateCookieName);
  return response;
}

function renderOAuthErrorPage(error: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Вход не сработал - Getflora</title>
  </head>
  <body>
    <main style="min-height:100vh;display:grid;place-items:center;background:#f4f1ed;color:#241713;font-family:Inter,system-ui,sans-serif;">
      <section style="width:min(100% - 40px,420px);border-radius:24px;background:#fffaf7;padding:24px;">
        <h1 style="margin:0;font-size:24px;">Вход не сработал</h1>
        <p style="color:#75635d;line-height:1.5;">${escapeHtml(error)}</p>
        <a href="/?auth=1" style="display:block;margin-top:24px;border-radius:14px;background:#c75442;color:white;padding:12px 16px;text-align:center;text-decoration:none;font-weight:700;">Вернуться ко входу</a>
      </section>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
