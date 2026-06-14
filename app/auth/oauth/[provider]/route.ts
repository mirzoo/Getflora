import { NextResponse, type NextRequest } from "next/server";

import {
  buildOAuthAuthorizationUrl,
  createOAuthNonce,
  createOAuthState,
  getOAuthProviderSlug,
  getOAuthStateCookieName,
  oauthStateCookieMaxAgeSeconds,
} from "@/features/auth/services/oauth";
import { shouldUseSecureCookie } from "@/features/auth/services/session-token";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerParam } = await params;
  const provider = getOAuthProviderSlug(providerParam);

  if (!provider) {
    return new NextResponse("Unknown OAuth provider", { status: 404 });
  }

  const state = createOAuthState();
  const nonce = createOAuthNonce();

  try {
    const response = NextResponse.redirect(buildOAuthAuthorizationUrl(provider, state, nonce));

    response.cookies.set(getOAuthStateCookieName(provider), `${state}.${nonce}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookie(),
      path: "/",
      maxAge: oauthStateCookieMaxAgeSeconds,
    });

    return response;
  } catch (error) {
    console.error("OAuth authorization start failed", {
      provider,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return new NextResponse(renderOAuthErrorPage("Вход через этот сервис пока не настроен."), {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
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
