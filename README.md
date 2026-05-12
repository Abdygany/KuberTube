# KuberTube

Учебный workspace для целенаправленного изучения тем — без рекомендаций, лент и
автоплея. Полная продуктовая и техническая спецификация — в [`PROJECT.pdf`](./PROJECT.pdf).

Этот репозиторий находится в **Фазе 0** реализации: монорепо, базовый Next.js 15
фронтенд, Hono бэкенд, Postgres + Drizzle, email/password регистрация через
Better Auth.

## Prerequisites

- Node.js 20 LTS (`nvm use` подхватит `.nvmrc`)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker (для локального Postgres)

## Quick start

```bash
# 1. Скопировать env-файл и заполнить секреты
cp .env.example .env
# - сгенерируй BETTER_AUTH_SECRET: openssl rand -base64 32
# - сгенерируй ENCRYPTION_KEY:    openssl rand -hex 32

# 2. Установить зависимости
pnpm install

# 3. Поднять Postgres
docker compose up -d

# 4. Сгенерировать и применить миграции (первый раз)
pnpm db:generate
pnpm db:migrate

# 5. Запустить dev-стек (web :3000, api :3001)
pnpm dev
```

Проверь:

- `curl http://localhost:3001/health` → `{"ok":true,"service":"kubertube-api"}`
- открой `http://localhost:3000`, перейди в `/sign-up`, зарегистрируйся —
  в таблице `users` появится строка.

## Структура

```
apps/
  web/    Next.js 15 (App Router, Tailwind, TanStack Query)
  api/    Hono + Better Auth
packages/
  db/     Drizzle schema + миграции (users, sessions, accounts, user_settings)
  config/ tsconfig базовый, eslint flat, prettier, tailwind preset
```

`packages/api-types`, `packages/core`, `packages/ui` появятся в Фазах 1-3
вместе с tRPC-роутерами и бизнес-логикой.

## Скрипты

| Команда             | Описание                                  |
| ------------------- | ----------------------------------------- |
| `pnpm dev`          | web + api в watch-режиме (turbo)          |
| `pnpm build`        | production-сборка всех воркспейсов        |
| `pnpm lint`         | ESLint flat config                        |
| `pnpm typecheck`    | `tsc --noEmit` во всех пакетах            |
| `pnpm db:generate`  | сгенерировать новую миграцию по схеме     |
| `pnpm db:migrate`   | применить миграции к `DATABASE_URL`       |
| `pnpm db:studio`    | Drizzle Studio на http://local.drizzle.studio |

## Дальше

- Фаза 1: BYO API keys (AES-256-GCM), onboarding, settings, workspaces
- Фаза 2: поиск YouTube + Brave Search с применением фильтров
- Фаза 3: YouTube IFrame плеер с перехватом `ended`, Mozilla Readability,
  TipTap заметки с таймкодами

Подробный план — раздел 6 в [`PROJECT.pdf`](./PROJECT.pdf).
