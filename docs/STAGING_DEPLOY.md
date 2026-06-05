# Staging Deploy

Статус: done for staging MVP.

Staging нужен только для внутренней проверки Getflora по ссылке. Это не
production launch: backup и production flow еще не доведены, а данные можно
сбрасывать.

## Текущая схема

- VPS: Timeweb Cloud.
- OS: Ubuntu.
- PostgreSQL 16: Docker Compose.
- MinIO: Docker Compose.
- Nginx reverse proxy: порт `80 -> 3000`.
- Next.js app: временно запускается напрямую на VPS через Node.js + PM2.
- Репозиторий на сервере: `/root/Getflora`.

Почему app пока не в Docker: сборка зависала на `npm install` внутри Docker
build из-за связки Docker build, npm registry и сети VPS. Для staging принято
временное MVP-решение: база и MinIO в Docker, приложение через PM2.

## Staging env

Пример без реальных секретов:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:55432/<db>
NEXT_PUBLIC_APP_URL=https://getflora.ru

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=getflora-listings
S3_ACCESS_KEY_ID=<minio-user>
S3_SECRET_ACCESS_KEY=<minio-password>
S3_PUBLIC_URL=http://<staging-host>:9000/getflora-listings
```

Важно: `S3_PUBLIC_URL` должен быть задан перед `npm run build`, потому что
Next.js использует его в `next.config.ts` для разрешения remote images.

## Обновление staging

```bash
cd /root/Getflora
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart getflora-staging
pm2 status
```

Если PM2-процесс конфликтует со старым `next start`:

```bash
pkill -f "next start"
pkill -f "next-server"
pm2 delete getflora-staging
pm2 start npm --name getflora-staging --cwd /root/Getflora -- start
pm2 save
pm2 status
```

## Проверка после деплоя

Дата последней ручной проверки: 2026-06-02.

Пройдено:

1. `pm2 status` показывает `getflora-staging` как `online`.
2. Главная страница открывается через Nginx по `https://getflora.ru`.
3. Авторизация через email и пароль проходит, сессия переживает refresh.
4. Создание объявления с фото проходит без ошибки S3 env.
5. Карточка и модалка объявления показывают загруженные фото через `next/image`.
6. Редактирование объявления позволяет добавить и удалить фото.
7. Избранное и чат работают между двумя тестовыми пользователями.
8. Статус `Продано` скрывает объявление из marketplace.
9. Выбранный город сохраняется после refresh.
10. Чат блокирует повторный submit во время отправки сообщения.

## Known Issues

- Preview выбранных фото в форме создания/редактирования пока не отображается
  стабильно. Upload и отображение после публикации работают, но UI picker нужно
  перепроектировать при следующей UI-проработке страницы.
- Фото с камеры iPhone могут превышать лимит 8 МБ. Нужен client-side
  compression/resize перед upload.
- Мобильные модалки требуют отдельного UI-polish под safe area и адресную
  строку iOS.
- После подключения домена проверять мобильный доступ через `https://getflora.ru`,
  а не через голый `http://IP`.
- Нужен backup/reset-процесс для staging-данных.
- Dockerfile для app нужно вернуть перед production deploy.

## Следующий фокус

Iteration 9: Production Auth.

Staging можно использовать для внутреннего тестирования, но не для публичного
запуска: backups и production deploy flow не доведены.
