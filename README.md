# KuberTube

Учебный workspace для целенаправленного изучения тем — без рекомендаций, лент и
автоплея. Полная продуктовая и техническая спецификация — в [`PROJECT.pdf`](./PROJECT.pdf).

## What's in

- **Auth + onboarding**: email/password (Better Auth), 5-step onboarding writes profile defaults.
- **BYO API keys**: YouTube + Brave (required) + Anthropic (optional). AES-256-GCM at rest with per-row AAD.
- **Workspaces**: title + goal + filters (level / duration / balance / freshness). Soft-delete with 30-day purge cron.
- **Search**: parallel YouTube + Brave with cache, partial-success UI, persistent-error tombstones.
- **Resource viewer**: YouTube IFrame with `rel=0` + `ended → stopVideo`; Mozilla Readability article view behind an SSRF-hardened fetcher. Notes in TipTap with timecode insertion.
- **AI summary** (Anthropic): short / detailed, rendered as markdown.
- **Saved-content search** (`⌘K`), workspace markdown export.
- **Account deletion** with email confirm (full cascade).
- **104 unit tests** for crypto, search, URL, reader IP-private detection, and markdown helpers.
- **CI** on every PR (typecheck + lint + test + format:check + build matrix).

## Deploy

Step-by-step Railway deploy in [`DEPLOY.md`](./DEPLOY.md) — one project hosts
Postgres + api + web + nightly cleanup cron.

## Prerequisites (local development)

- Node.js 20.10+ (Node 22 recommended; CI runs 22)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- Docker (for local Postgres)

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

# 4. Применить миграцию (включена в репозитории)
pnpm db:migrate
# или быстрый dev-цикл (sync без журнала):
# pnpm db:push

# 5. Запустить dev-стек (web :3000, api :3001)
pnpm dev
```

Проверь:

- `curl http://localhost:3001/health` → `{"ok":true,"service":"kubertube-api"}`
- `curl http://localhost:3001/health/ready` → проверяет также Postgres.
- открой `http://localhost:3000`, перейди в `/sign-up`, зарегистрируйся.
- добавь YouTube + Brave API ключи в `Settings` (см. `/docs/api-keys`).
- создай workspace → нажми `Run search`.

## Структура

```
apps/
  web/    Next.js 15 (App Router, Tailwind, TanStack Query, TipTap, react-youtube)
  api/    Hono + Better Auth + tRPC v11 + Anthropic + Mozilla Readability (SSRF-guarded)
packages/
  db/     Drizzle schema + миграции + cleanup script
  core/   AES-256-GCM crypto, key validators, search engine, helpers (server-only marker per submodule)
  api-types/  AppRouter type re-export
  config/ tsconfig базовый, eslint flat, prettier, tailwind preset
```

## Скрипты

| Команда            | Описание                                        |
| ------------------ | ----------------------------------------------- |
| `pnpm dev`         | web + api в watch-режиме (turbo)                |
| `pnpm build`       | production-сборка всех воркспейсов              |
| `pnpm lint`        | ESLint flat config                              |
| `pnpm typecheck`   | `tsc --noEmit` во всех пакетах                  |
| `pnpm test`        | vitest (104 cases в @kubertube/core + apps/api) |
| `pnpm format`      | prettier --write по репо                        |
| `pnpm db:generate` | drizzle-kit generate (создать новую миграцию)   |
| `pnpm db:push`     | drizzle-kit push (schema sync, dev only)        |
| `pnpm db:migrate`  | применить миграции к `DATABASE_URL`             |
| `pnpm db:studio`   | Drizzle Studio на http://local.drizzle.studio   |
| `pnpm db:cleanup`  | физическое удаление soft-deleted старше 30 дней |

## Contributing

См. [`CONTRIBUTING.md`](./CONTRIBUTING.md) — основные принципы кода (server-only
маркер, AAD на ключах, SSRF-guard, авторизация по join'ам, optimistic updates).

## License

MIT — см. [`LICENSE`](./LICENSE).
