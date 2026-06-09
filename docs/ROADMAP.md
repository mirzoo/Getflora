# Roadmap

## Ближайший фокус

1. **Закрытый beta** на `https://getflora.ru` (5–20 тестеров), сбор фидбека.

2. **Iteration 12 — Auctions**:
   - ставки, таймер, минимальная ставка, закрытие аукциона.

3. **Iteration 13 — Production Deployment**:
   - Docker app, мониторинг, backup БД.

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
