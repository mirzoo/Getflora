# Roadmap

## Ближайший фокус

1. Production Auth:
   - внедрить email + пароль;
   - заменить cookie `userId` на server-side session cookie;
   - проверить регистрацию, вход, выход и refresh session на `https://getflora.ru`;
   - сохранить совместимость с Docker/VPS;
   - не делать обязательный вход через Google/Apple/GitHub.

## Потом

- Client-side compression/resize для мобильных фото.
- Magic link после выбора email provider.
- Проверка домена и HTTPS для staging: `https://getflora.ru`.
- UI-polish мобильных модалок и photo picker.
- Backup/reset staging-данных.
- Production cleanup через cron/background job.
- Production deploy на Docker/VPS.

## Пока не делать

- Не подключать внешние auth-сервисы.
- Не подключать платежи.
- Не считать staging публичным production launch.
