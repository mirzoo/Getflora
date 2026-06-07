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
  <body style="margin:0;padding:0;background-color:#f6f7f8;color:#222222;font-family:Inter,Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Одноразовая ссылка для входа в Getflora. Действует ${ttlMinutes} минут.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f6f7f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #d9dce1;border-radius:16px;overflow:hidden;box-shadow:0 16px 40px rgba(17,25,40,0.08);">
            <tr>
              <td style="padding:28px 28px 12px;text-align:center;">
                <div style="display:inline-block;font-size:24px;line-height:1;font-weight:800;color:#fd4604;letter-spacing:0;">
                  Getflora
                </div>
                <p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#8891a3;">
                  Маркетплейс подаренных букетов
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <h1 style="margin:0;font-size:24px;line-height:1.25;color:#222222;">
                  Вход в аккаунт
                </h1>
                <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#8891a3;">
                  Здравствуйте! Нажмите кнопку ниже, чтобы войти или завершить регистрацию.
                  Ссылка одноразовая и действует <strong style="color:#222222;">${ttlMinutes} минут</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 8px;text-align:center;">
                <a
                  href="${safeLink}"
                  style="display:inline-block;background-color:#fd4604;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;line-height:1;padding:14px 28px;border-radius:14px;"
                >
                  Войти в Getflora
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#8891a3;">
                  Если кнопка не открывается, скопируйте ссылку в браузер:
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#fd4604;word-break:break-all;">
                  <a href="${safeLink}" style="color:#fd4604;text-decoration:underline;">${safeLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff1ec;border-radius:16px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:#222222;">
                      Если вы не запрашивали вход, просто проигнорируйте это письмо. Никому не пересылайте ссылку.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;text-align:center;font-size:12px;line-height:1.5;color:#8891a3;">
                <a href="https://getflora.ru" style="color:#8891a3;text-decoration:none;">getflora.ru</a>
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
