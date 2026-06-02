# Roadmap

## Ближайший фокус

1. Staging-деплой:
   - стабилизировать PM2 на Timeweb Cloud VPS;
   - проверить S3/MinIO upload и отображение фото;
   - подключить reverse proxy на порт 80;
   - позже подключить домен и HTTPS;
   - зафиксировать backup/reset staging-данных;
   - Dockerfile для app вернуть перед production deploy.

## Потом

- Нормальная авторизация: magic link или пароль.
- Подтверждение email.
- Production cleanup через cron/background job.
- Production deploy на Docker/VPS.

## Пока не делать

- Не подключать внешние auth-сервисы.
- Не подключать платежи.
- Не считать staging публичным production launch.
