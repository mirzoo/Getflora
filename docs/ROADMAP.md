# Roadmap

## Ближайший фокус

1. Staging-деплой:
   - Dockerfile для Next.js app;
   - staging compose/env;
   - PostgreSQL;
   - S3-compatible storage или MinIO;
   - миграции и cleanup;
   - проверка сайта по публичной/закрытой ссылке.

## Потом

- Нормальная авторизация: magic link или пароль.
- Подтверждение email.
- Production cleanup через cron/background job.
- Production deploy на Docker/VPS.

## Пока не делать

- Не подключать внешние auth-сервисы.
- Не подключать платежи.
- Не считать staging публичным production launch.
