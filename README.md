# ReBloom

ReBloom — web-first MVP маркетплейса для перепродажи подаренных букетов.
Приложение собрано как один Next.js-монолит: витрина, объявления, избранное,
сообщения, простая учетная запись и доступ к PostgreSQL живут в одном кодбейсе.

## Стек

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL + Prisma 7
- `@prisma/adapter-pg` + `pg`
- MinIO / S3-compatible storage для локальной загрузки фото

## Локальный запуск

```bash
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

По умолчанию открыть:

```text
http://localhost:3000
```

Если порт занят, Next.js предложит другой, например `3001`.

## Переменные окружения

Скопируйте пример:

```bash
cp .env.example .env
```

Пример для локального PostgreSQL:

```env
DATABASE_URL="postgresql://rebloom:rebloom_dev@localhost:55432/rebloom?schema=public"
S3_ENDPOINT="http://127.0.0.1:9000"
S3_REGION="us-east-1"
S3_BUCKET="rebloom-listings"
S3_ACCESS_KEY_ID="rebloom_minio"
S3_SECRET_ACCESS_KEY="rebloom_minio_dev"
S3_PUBLIC_URL="http://localhost:9000/rebloom-listings"
```

`.env` не коммитится. `.env.example` коммитится.

## База данных

Локальная база запускается через Docker Compose:

```bash
docker compose up -d
```

Docker Compose также поднимает MinIO для фото:

```text
S3 API: http://localhost:9000
MinIO Console: http://localhost:9001
Логин: rebloom_minio
Пароль: rebloom_minio_dev
```

После запуска PostgreSQL:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Полезные команды:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:cleanup
npm run db:studio
```

`db:cleanup` переводит просроченные активные объявления в `EXPIRED` и удаляет
проданные объявления старше 24 часов.

## Структура

```txt
app/          Next.js routes
components/   общие UI и layout-компоненты
features/     доменные фичи: listings, auth, chat, favorites
db/           Prisma client
prisma/       schema, migrations, seed
types/        общие TypeScript-типы
docs/         подробные проектные заметки и roadmap
```

## Документация

- [Project Notes](docs/PROJECT_NOTES.md) — что уже сделано и какие решения приняты.
- [Roadmap](docs/ROADMAP.md) — ближайшие следующие шаги.

## Инфраструктурный принцип

Проект не должен жестко зависеть от одного хостинг-провайдера. Production-путь
должен оставаться совместимым с Docker/VPS, обычным PostgreSQL connection string
и S3-compatible storage для будущей загрузки фото.
