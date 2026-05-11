# Learnspace

Учебный workspace для студентов 18-25 лет, защищающий намерение учиться от
рекомендаций, лент и алгоритмических отвлечений.

> **Статус:** Фаза 0 — раскладка монорепо. Реализация фич — впереди.
> См. `PROJECT.pdf` (источник истины) и `CLAUDE.md` (контракт работы Claude Code).

## Стек

- **Frontend** — Next.js 15 (App Router), Tailwind, shadcn/ui, TanStack Query, Zustand
- **Backend** — Hono + tRPC, Better Auth, Drizzle ORM
- **БД** — Postgres
- **Внешние API (BYO keys)** — YouTube Data v3, Brave Search, Anthropic (опционально)
- **Инфраструктура** — pnpm workspaces + Turborepo

## Структура

```
apps/
  web/   — Next.js (landing + docs + app)
  api/   — Hono backend
packages/
  db/         — Drizzle schema + миграции
  api-types/  — общие типы tRPC роутеров
  core/       — бизнес-логика (поиск, фильтрация, парсинг)
  ui/         — shadcn/ui компоненты
  config/     — eslint/tsconfig/tailwind пресеты
```

## Запуск локально

Требуется Node ≥ 22 и pnpm ≥ 10.

```bash
pnpm install
pnpm typecheck
pnpm lint
```

Dev-сервер, миграции, docker-compose для Postgres — будут добавлены в следующих
коммитах Фазы 0.

## Девять UX-принципов

Это закон проекта (PROJECT.pdf §5):

1. Никаких рекомендаций «вам может быть интересно».
2. Никакого автоплея.
3. Никаких бесконечных лент. Списки имеют конец.
4. Никаких ярких уведомлений ради привлечения.
5. Никаких авто-пушей про «активность» и «стрики».
6. Никаких стриков, бейджей, очков опыта.
7. Понятный быстрый escape без «вы уверены?» каждый раз.
8. Без dark patterns. Кнопки удаления одного цвета с подтверждениями.
9. Закрытая система: пользователь видит только то, что сам положил в workspace.

## Лицензия

MIT (планируется — финализируется перед публичным релизом).
