import { NextResponse, type NextRequest } from "next/server";

import { consumeMagicLink } from "@/features/auth/services/magic-link";
import { createUserSessionToken } from "@/features/auth/services/session";
import {
  authCookieName,
  legacyAuthCookieName,
  sessionMaxAgeSeconds,
  shouldUseSecureCookie,
} from "@/features/auth/services/session-token";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await consumeMagicLink(token);

  if (!result.ok) {
    return new NextResponse(renderErrorPage(result.error), {
      status: 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  const sessionToken = await createUserSessionToken(result.userId);
  const response = NextResponse.redirect(new URL("/?account=1", request.url));

  response.cookies.set(authCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(),
    path: "/",
    maxAge: sessionMaxAgeSeconds,
  });
  response.cookies.delete(legacyAuthCookieName);

  return response;
}

function renderErrorPage(error: string) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ссылка не сработала - Getflora</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f4f1ed;
        color: #241713;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      section {
        width: min(100% - 40px, 420px);
        border-radius: 24px;
        background: #fffaf7;
        padding: 24px;
        box-shadow: 0 18px 50px rgba(36, 23, 19, 0.12);
      }
      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.2;
      }
      p {
        margin: 12px 0 0;
        color: #75635d;
        line-height: 1.5;
      }
      a {
        display: block;
        margin-top: 24px;
        border-radius: 14px;
        background: #c75442;
        color: white;
        padding: 12px 16px;
        text-align: center;
        text-decoration: none;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <section>
      <h1>Ссылка не сработала</h1>
      <p>${escapeHtml(error)}</p>
      <a href="/?auth=1">Запросить новую ссылку</a>
    </section>
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
