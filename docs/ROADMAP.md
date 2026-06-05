# Roadmap

## Ближайший фокус

1. Production Auth:
   - внедрить email + пароль;
   - заменить cookie `userId` на server-side session cookie;
   - проверить регистрацию, вход, выход и refresh session;
   - сохранить совместимость с Docker/VPS;
   - не делать обязательный вход через Google/Apple/GitHub.

## Потом

- Client-side compression/resize для мобильных фото.
- Magic link после домена, HTTPS и email provider.
- Домен и HTTPS для staging.
- UI-polish мобильных модалок и photo picker.
- Backup/reset staging-данных.
- Production cleanup через cron/background job.
- Production deploy на Docker/VPS.

## Пока не делать

- Не подключать внешние auth-сервисы.
- Не подключать платежи.
- Не считать staging публичным production launch.
