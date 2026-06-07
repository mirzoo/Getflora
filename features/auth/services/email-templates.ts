function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

type MagicLinkEmailInput = {
  magicLink: string;
  ttlMinutes: number;
};

export function buildMagicLinkEmail({ magicLink, ttlMinutes }: MagicLinkEmailInput) {
  const safeLink = escapeHtml(magicLink);
  const subject = "Вход в Getflora";

  const text = [
    "Здравствуйте!",
    "",
    "Нажмите ссылку ниже, чтобы войти или завершить регистрацию в Getflora:",
    magicLink,
    "",
    `Ссылка действует ${ttlMinutes} минут и может быть использована один раз.`,
    "Если вы не запрашивали вход, просто проигнорируйте это письмо.",
    "",
    "— Getflora",
    "https://getflora.ru",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f1ed;color:#241713;font-family:Inter,Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Одноразовая ссылка для входа в Getflora. Действует ${ttlMinutes} минут.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f1ed;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#fffaf7;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(36,23,19,0.10);">
            <tr>
              <td style="padding:28px 28px 12px;text-align:center;">
                <div style="display:inline-block;font-size:24px;line-height:1;font-weight:800;color:#c75442;letter-spacing:-0.02em;">
                  Getflora
                </div>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#75635d;">
                  Маркетплейс подаренных букетов
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#241713;">
                  Вход в аккаунт
                </h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#75635d;">
                  Здравствуйте! Нажмите кнопку ниже, чтобы войти или завершить регистрацию.
                  Ссылка одноразовая и действует <strong style="color:#241713;">${ttlMinutes} минут</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px;text-align:center;">
                <a
                  href="${safeLink}"
                  style="display:inline-block;background-color:#c75442;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;line-height:1;padding:14px 28px;border-radius:14px;"
                >
                  Войти в Getflora
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#75635d;">
                  Если кнопка не открывается, скопируйте ссылку в браузер:
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#c75442;word-break:break-all;">
                  <a href="${safeLink}" style="color:#c75442;text-decoration:underline;">${safeLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f1ed;border-radius:16px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#75635d;">
                      Если вы не запрашивали вход, просто проигнорируйте это письмо. Никому не пересылайте ссылку.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;text-align:center;font-size:12px;line-height:1.5;color:#9a8b85;">
                <a href="https://getflora.ru" style="color:#9a8b85;text-decoration:none;">getflora.ru</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject,
    text,
    html,
  };
}
