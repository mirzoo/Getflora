# Project Notes

## Текущий статус

**Итерации 0–11:** закрыты. **Iteration 9 (Production Auth)** и **Iteration 10 (Admin &
Moderation)** проверены на `https://getflora.ru`. **Iteration 11 (Beta Readiness):**
закрыта 2026-06-09 — Yandex S3, cron cleanup, iPhone photo compression, критичный QA.

Последний большой блок работ (Cursor, ветка `migrate-to-cursor` → `main`):

- Admin: `/admin`, жалобы, баны, audit log, доступ через `ADMIN_EMAILS`.
- Чат: без автоприветствия, unique на диалог, «Продано» из чата, `soldToBuyerId` в админке.
- Фото: Yandex Object Storage локально проверен; `next.config` знает `storage.yandexcloud.net`.
- UI Kit: snapshot Figma в `design/`, токены в CSS, модалка объявления и auth-modal под mobile sheet.
- Миграции: `20260607000100_add_admin_moderation`, `20260607000200_chat_and_sold_buyer`.

**Следующий фокус:** закрытый beta на 5–20 тестеров, сбор фидбека → **Iteration 12
(Auctions)**.

Проект переименован в Getflora, публичный домен: `https://getflora.ru`.

## Пользовательские сценарии

- Гость может смотреть маркетплейс.
- Для избранного, покупки, чата и публикации объявления нужен вход.
- Пользователь не может купить свое объявление.
- Покупатель открывает чат с продавцом объявления.
- Продавец видит покупателя в списке сообщений и внутри чата.
- При открытии чата **автосообщение не отправляется** (раньше был шаблон — убран).
- Продавец может отметить **«Продано — снять с публикации»** прямо в чате; в админке
  видно `soldToBuyer`, если продажа отмечена из чата.
- Жалоба на объявление → `/admin/reports` → блокировка модератором.

## Admin And Moderation

Iteration 10 (код в репозитории):

- Доступ: env `ADMIN_EMAILS` (comma-separated), общая session с маркетплейсом.
- `/admin`, `/admin/listings`, `/admin/users`, `/admin/reports`.
- Блокировка/разблокировка/архив/удаление объявлений; бан/разбан пользователей.
- `Report`, `AdminAction`, audit log в PostgreSQL.
- Миграция `20260607000100_add_admin_moderation`.

QA: `skills/getflora-qa/SKILL.md` (сценарии admin и reports).

## Chat

- Диалог: unique `(listingId, buyerId)` — миграция `20260607000200_chat_and_sold_buyer`.
- Отправка сообщений: `revalidatePath` только для страницы чата (не вся главная).
- `Listing.soldToBuyerId` — покупатель при «Продано» из чата; из «Мои объявления» без чата
  покупатель не заполняется.

## Seller Workflow

Сверх базового плана добавлено управление объявлениями:

- Раздел `Мои объявления`.
- Отдельные блоки активных и проданных объявлений.
- Понятные пустые состояния и статусные подсказки у карточек.
- Редактирование активного объявления.
- Кнопка `Продано`: статус `SOLD`, объявление исчезает из маркетплейса.
- Проданное объявление остается в `Мои объявления` 24 часа после `soldAt`.
- Кнопка `Снять`: статус `EXPIRED`, объявление сразу исчезает из маркетплейса и `Мои объявления`.
- Старые проданные объявления удаляются cleanup-логикой.

Редактирование ограничено:

- только владелец объявления;
- только статус `ACTIVE`;
- можно менять цену, район, количество цветов, состав, цвета, описание и ссылки
  на фото;
- нельзя редактировать `SOLD`, `EXPIRED`, `BLOCKED`;
- `createdAt` и `expiresAt` не меняются, поэтому редактирование не продлевает
  срок жизни объявления и не поднимает его как новое.

## Auth

Iteration 9: production auth с magic-link-first onboarding.

Основной flow:

- пользователь вводит email и получает одноразовую ссылку;
- если аккаунт уже есть — вход и session cookie;
- если аккаунта нет — `/auth/complete`, пользователь задает имя, затем session;
- пароль остается fallback через отдельные режимы «Вход по паролю» и
  «Регистрация с паролем».

Техническая реализация:

- регистрация по email, имени и паролю (fallback);
- вход по email и паролю (fallback);
- вход по magic link через SMTP-почту Timeweb;
- пароль хранится как server-side hash;
- httpOnly cookie хранит session token, а не `userId`;
- в БД хранится только hash session token;
- magic-link token хранится только как server-side hash, TTL 15 минут,
  одноразовое использование;
- rate limit magic link: 3 запроса на email за 10 минут;
- старые staging-пользователи без `passwordHash` могут привязать пароль при
  регистрации с тем же email.

Для magic link нужны env `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `AUTH_EMAIL_FROM` и корректный `NEXT_PUBLIC_APP_URL`.
Google/Yandex OAuth добавляются как дополнительный вход: email-код остается
основным способом, новые OAuth-пользователи завершают профиль без пароля.

Текущий production-auth статус:

- внешний email API удалён из проекта и больше не используется;
- Timeweb разблокировал исходящие почтовые порты VPS, `smtp.timeweb.ru:465`
  отвечает по TLS;
- на VPS нужны env `SMTP_HOST="smtp.timeweb.ru"`, `SMTP_PORT="465"`,
  `SMTP_USER="auth@getflora.ru"`, `SMTP_PASSWORD`, `AUTH_EMAIL_FROM="Getflora
  <auth@getflora.ru>"`, `NEXT_PUBLIC_APP_URL="https://getflora.ru"`;
- PR #10 `Add magic link auth` был смёржен в `main`, применён на VPS, миграция
  `20260606000100_add_magic_link_tokens` применена;
- письмо magic link отправляется через корпоративный ящик `auth@getflora.ru`;
- callback bug закрыт: `/auth/magic` — route handler, cookie через
  `NextResponse`;
- magic-link-first onboarding реализован в коде; нужна проверка на домене после
  деплоя ветки с изменениями.

## Фото

Начата настоящая загрузка файлов:

- локально используется MinIO из Docker Compose;
- форма создания объявления принимает до 10 файлов JPG/PNG/WebP;
- форма редактирования тоже принимает новые файлы;
- UI фото показывает квадратную кнопку добавления, превью и удаление по hover;
- backend загружает файлы в S3-compatible bucket;
- в базе каждая картинка по-прежнему хранится как URL в `ListingImage`;
- ссылки на фото оставлены как запасной вариант.

Ограничения текущего шага:

- управление фото в редактировании пока простое: новые файлы добавляются после
  уже существующих превью;
- старые MinIO-файлы удаляются, если их убрали из списка;
- внешний URL не удаляется из storage, потому что он не принадлежит Getflora.

Следующее улучшение для мобильной загрузки:

- добавить client-side compression/resize перед upload, потому что фото с
  камеры iPhone часто превышают текущий лимит размера файла.

## Cleanup

Есть два механизма:

- автоматический вызов при серверной загрузке главной;
- ручная команда `npm run db:cleanup`.

Cleanup сейчас:

- переводит активные объявления с истекшим `expiresAt` в `EXPIRED`;
- удаляет проданные объявления старше 24 часов после `soldAt`.

В будущем на VPS это лучше вынести в cron/background job.

## Staging Deploy

Iteration 8 закрыта как staging MVP, детали в `docs/STAGING_DEPLOY.md`.

Уже сделано:

- Timeweb Cloud VPS поднят;
- PostgreSQL 16 и MinIO работают через Docker Compose;
- bucket `getflora-listings` создан и открыт на чтение;
- проект склонирован на VPS;
- миграции применены через `prisma migrate deploy`;
- приложение временно запускается напрямую через Node.js + PM2;
- Nginx reverse proxy подключен на порт `80`;
- основной A/B marketplace-flow вручную проверен на staging.

Текущее staging-решение прагматичное: app пока не в Docker, потому что Docker
build зависал на `npm install` внутри VPS. Для production к Dockerfile или
отдельному production deploy flow нужно вернуться.

Known issues:

- preview выбранных фото в форме пока не отображается стабильно;
- мобильные модалки требуют отдельной UI-проработки;
- фото с камеры iPhone требуют client-side compression/resize перед upload;
- мобильный доступ по голому `http://IP` нестабилен;
- домен `getflora.ru` подключен, HTTPS нужно проверить на staging;
- описать backup/reset staging-данных.

Staging можно сбрасывать и использовать как внутреннюю среду разработки. Его не
нужно считать production, пока auth остается временной.

## Design (Figma UI Kit)

Локальный snapshot UI Kit (без запросов в Figma на каждую задачу):

- `design/tokens.colors.json`, `design/tokens.typography.json` — стили Colors + Typography
- `design/tokens.css` — CSS variables `--gf-*` и utility `.gf-text-h1` … `.gf-text-body-xs`
- `design/ui-kit.snapshot.json` — компоненты UI Kit + ссылки на Figma
- `docs/DESIGN_SYSTEM.md` — справочник для агентов
- `.cursor/rules/getflora-design.mdc` — правило local-first для Cursor
- `app/globals.css` подключает `design/tokens.css`
- `tailwind.config.ts` — часть токенов в theme
- `components/ui/button.tsx`, `input.tsx`, `button-box.tsx` — базовые компоненты под kit

UI в коде:

- модалка объявления (`listing-details-modal.tsx`) — mobile bottom sheet, `rounded-t-[28px]`;
- auth modal в `marketplace-shell.tsx` — hero `public/auth/modal-hero.jpg`, social placeholders;
- admin UI — отдельный визуальный каркас в `features/admin/components/admin-ui.tsx`.

Figma-источник: https://www.figma.com/design/XMtbYH7An0vDncxWEhAt07/GetFlora?node-id=99-20850
(`fileKey` `XMtbYH7An0vDncxWEhAt07`, UI Kit `99:20850`). Refresh snapshot — по явному запросу.

## Storage (S3)

- Локально: MinIO в Docker Compose (`S3_*` в `.env.example`).
- Beta/production: Yandex Object Storage (`storage.yandexcloud.net`) — проверен локально.
- `next.config.ts`: remotePatterns для MinIO + Yandex + `S3_PUBLIC_URL`.
- После смены `S3_*` или `next.config` — перезапуск `npm run dev`.

## Важное по миграциям

Миграция `20260531000300_add_listing_lifecycle_dates` добавляет:

- `soldAt`
- `archivedAt`

Миграция `20260531000400_add_listing_expiration` добавляет:

- `expiresAt`

Локально Prisma schema engine один раз падал без текста ошибки на `migrate dev`.
Колонки были добавлены вручную через `psql`, а миграция отмечена в
`_prisma_migrations`.
