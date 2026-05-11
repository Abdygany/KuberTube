# Развёртка локально

Гайд для разработчика, который впервые поднимает Learnspace. Цель —
рабочее окружение за 15 минут.

## Требования

- **Node.js** ≥ 22 (используется ESM, native test runner)
- **pnpm** ≥ 10 (`corepack enable && corepack prepare pnpm@10 --activate`)
- **Docker** + Docker Compose (для локального Postgres)

## Первый запуск

```bash
# 1. Зависимости
pnpm install

# 2. Env (заполните секреты на ваш выбор, для локалки можно оставить дефолты)
cp .env.example .env

# 3. Postgres
docker compose up -d postgres

# 4. Миграции
pnpm --filter @learnspace/db db:generate
pnpm --filter @learnspace/db db:migrate

# 5. Запуск
pnpm dev
```

`pnpm dev` поднимает оба приложения через Turbo:

- `apps/web` — Next.js на http://localhost:3000
- `apps/api` — Hono на http://localhost:3001

## Проверки

```bash
pnpm -w typecheck     # tsc по всем пакетам
pnpm -w lint          # ESLint по всем пакетам
pnpm -w test          # node:test по packages/core (крипта)
pnpm -w build         # сборка apps/web + apps/api
pnpm format           # автоформат всех файлов
pnpm format:check     # проверка формата без правок
```

## Переменные окружения

| Переменная            | Где используется                             | Примечание                                                |
| --------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`        | `apps/api`, `packages/db`                    | Connection string Postgres                                |
| `ENCRYPTION_KEY`      | `apps/api` (через `@learnspace/core/crypto`) | ≥32 символа, AES-256-GCM мастер для шифрования BYO-ключей |
| `AUTH_SECRET`         | `apps/api` (Better Auth)                     | ≥32 символа, подпись session-cookie                       |
| `BETTER_AUTH_URL`     | `apps/api` (Better Auth)                     | base URL самого API                                       |
| `WEB_ORIGIN`          | `apps/api` (CORS + trustedOrigins)           | Origin фронтенда                                          |
| `NEXT_PUBLIC_API_URL` | `apps/web`                                   | URL API, виден в браузере                                 |

## Структура

```
apps/
  web/         Next.js 15 (App Router)
  api/         Hono + tRPC + Better Auth
packages/
  config/      ESLint, TS, Tailwind пресеты
  core/        Бизнес-логика. На Ф0 — только AES-крипта BYO-ключей.
  db/          Drizzle ORM, схема из PROJECT.pdf §4
  ui/          shadcn/ui helper, компоненты добавляются по мере необходимости
  api-types/   Типы tRPC для шеринга между приложениями
```

## Где что лежит

| Что хотите изменить         | Куда смотреть                                          |
| --------------------------- | ------------------------------------------------------ |
| Схема БД                    | `packages/db/src/schema/*.ts`                          |
| tRPC роуты                  | `apps/api/src/routers/*.ts` + `apps/api/src/router.ts` |
| Auth-конфиг                 | `apps/api/src/auth.ts`                                 |
| Страницы фронта             | `apps/web/src/app/**`                                  |
| Голос UI-текстов            | `.claude/skills/learnspace-soul/`                      |
| Контракт работы Claude Code | корневой `CLAUDE.md`                                   |

## CI

GitHub Actions `.github/workflows/ci.yml` гоняет на каждом PR в `main`:
`format:check → typecheck → lint → test → build`. Падение любого шага —
блок мержа.

## Деплой

Ф0 не включает деплой. Целевые платформы (Vercel + Railway) описаны в
PROJECT.pdf §3 и подключаются в Ф1.
