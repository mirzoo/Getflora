# Roadmap

## Ближайший фокус

1. **Iteration 9 — Production Auth** (финал на домене):
   - проверить новый пользователь: email → письмо → `/auth/complete` → session;
   - существующий пользователь: email → письмо → session;
   - fallback: пароль, выход, refresh session.

2. **Iteration 10 — деплой на VPS**:
   - `git pull`, `npm run build`, PM2 restart;
   - `prisma migrate deploy` (миграции `20260607000100`, `20260607000200`);
   - env: `ADMIN_EMAILS`, Yandex `S3_*`.

3. **Iteration 11 — Beta Readiness**:
   - полный QA: `skills/getflora-qa/SKILL.md`;
   - Yandex S3 на staging;
   - HTTPS, backup staging, cron cleanup.

## Потом

- Client-side compression/resize для мобильных фото.
- UI-polish мобильных модалок (auth, listing details) по `docs/DESIGN_SYSTEM.md`.
- Iteration 12: Auctions.
- Iteration 13: Production Deployment (Docker app, мониторинг).
- Iteration 14: Growth And Product Tooling (Метрика, error monitoring, OAuth,
  SEO-страницы, Dadata/AI/монетизация после beta).

## Пока не делать

- Не подключать внешние auth-сервисы (Google/Apple OAuth).
- Не подключать платежи.
- Не считать staging публичным production launch.

## Для агентов (Codex / Cursor)

- Канонические правила: `AGENTS.md`, `docs/PROJECT_NOTES.md`, `docs/ITERATIONS.md`.
- QA-сценарии: `skills/getflora-qa/SKILL.md`.
- UI Kit local-first: `docs/DESIGN_SYSTEM.md`, `design/*`.
- Security: `docs/SECURITY_AND_OPERATIONS.md`.
