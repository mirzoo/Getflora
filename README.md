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

## Локальный запуск

```bash
npm install
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
DATABASE_URL="postgresql://mirzookhunov@localhost:5432/rebloom?schema=public"
```

`.env` не коммитится. `.env.example` коммитится.

## База данных

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

`db:cleanup` удаляет проданные объявления старше 24 часов.

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
