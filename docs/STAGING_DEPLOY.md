# Staging Deploy

Статус: in progress.

Staging нужен только для внутренней проверки ReBloom по ссылке. Это не
production launch: текущая auth временная, HTTPS/домен/backup еще не доведены,
а данные можно сбрасывать.

## Текущая схема

- VPS: Timeweb Cloud.
- OS: Ubuntu.
- PostgreSQL 16: Docker Compose.
- MinIO: Docker Compose.
- Next.js app: временно запускается напрямую на VPS через Node.js + PM2.
- Репозиторий на сервере: `/root/ReBloom`.

Почему app пока не в Docker: сборка зависала на `npm install` внутри Docker
build из-за связки Docker build, npm registry и сети VPS. Для staging принято
временное MVP-решение: база и MinIO в Docker, приложение через PM2.

## Staging env

Пример без реальных секретов:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:55432/<db>

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=rebloom-listings
S3_ACCESS_KEY_ID=<minio-user>
S3_SECRET_ACCESS_KEY=<minio-password>
S3_PUBLIC_URL=http://<staging-host>:9000/rebloom-listings
```

Важно: `S3_PUBLIC_URL` должен быть задан перед `npm run build`, потому что
Next.js использует его в `next.config.ts` для разрешения remote images.

## Обновление staging

```bash
cd /root/ReBloom
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart rebloom-staging
pm2 status
```

Если PM2-процесс конфликтует со старым `next start`:

```bash
pkill -f "next start"
pkill -f "next-server"
pm2 delete rebloom-staging
pm2 start npm --name rebloom-staging --cwd /root/ReBloom -- start
pm2 save
pm2 status
```

## Проверка после деплоя

1. `pm2 status` показывает `rebloom-staging` как `online`.
2. Порт `3000` держит PM2-процесс, а не старый ручной `next start`.
3. Главная страница открывается по staging-ссылке.
4. Авторизация через текущую временную auth проходит.
5. Создание объявления с фото проходит без ошибки S3 env.
6. Загруженное фото открывается по public MinIO URL.
7. Карточка и модалка объявления показывают фото через `next/image`.
8. Редактирование объявления позволяет добавить и удалить фото.
9. Избранное и чат работают между двумя тестовыми пользователями.
10. `npm run db:cleanup` можно выполнить вручную на сервере.

## Что осталось добить

- Стабилизировать PM2 и проверить, что app стартует с актуальным `.env`.
- Проверить upload/display фото на staging после чистого restart/build.
- Подключить reverse proxy: Caddy или Nginx, порт `80 -> 3000`.
- Позже подключить домен и HTTPS.
- Описать backup/reset staging-данных.
- Вернуться к Dockerfile для app перед production deploy.
