# Roadmap

## Ближайший фокус

1. Production Auth:
   - смёржить и задеплоить hotfix PR #11 для `/auth/magic` route handler;
   - повторно запросить magic link и проверить успешный вход на `https://getflora.ru`;
   - проверить регистрацию, вход по паролю, выход и refresh session на домене;
   - принять продуктовое решение по следующему auth UX:
     magic-link-first onboarding или оставить парольную регистрацию + magic link
     как fallback;
   - сохранить совместимость с Docker/VPS;
   - не делать обязательный вход через Google/Apple/GitHub.

## Потом

- Если выбираем magic-link-first onboarding:
  `email -> письмо -> новый пользователь вводит имя -> session`.
- Client-side compression/resize для мобильных фото.
- Проверка домена и HTTPS для staging: `https://getflora.ru`.
- UI-polish мобильных модалок и photo picker.
- Backup/reset staging-данных.
- Production cleanup через cron/background job.
- Production deploy на Docker/VPS.

## Пока не делать

- Не подключать внешние auth-сервисы.
- Не подключать платежи.
- Не считать staging публичным production launch.
