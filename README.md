# Learnspace

Distraction-free learning workspace for students. No recommendations, no feeds,
no algorithms — just focused sessions on a topic you actually came to learn.

This repository is the implementation of the Learnspace product specification
(see `PROJECT.pdf` for the full design doc). The full plan is split into 5
phases — this branch contains **Phase 0** (project scaffolding).

## Stack

- **Monorepo:** pnpm 9 + Turborepo 2
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query, tRPC client
- **Backend:** Hono 4, tRPC 11, Better Auth 1, Drizzle ORM, PostgreSQL 16
- **Shared:** AES-256-GCM encryption helper for user-supplied API keys

## Structure

```
apps/
  web/         Next.js 15 app (landing, auth, workspaces)
  api/         Hono backend (Better Auth + tRPC)
packages/
  db/          Drizzle schema + migrations
  api-types/   Shared tRPC AppRouter type
  core/        Business logic (encryption, soon: search, reader)
  config/      Shared TS/ESLint/Tailwind presets
docker-compose.yml   Local Postgres 16
```

## Local development

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure environment variables
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Generate strong secrets:
#   openssl rand -base64 32   -> BETTER_AUTH_SECRET
#   openssl rand -hex 32      -> ENCRYPTION_KEY

# 4. Push the database schema
pnpm db:push

# 5. Start everything (api on :3001, web on :3000)
pnpm dev
```

Then open <http://localhost:3000>, click "Get started", create an account, and
you should land on `/workspaces` with the API health check responding.

## Implementation roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Monorepo scaffolding, auth, deployment | **in progress** |
| 1 | Onboarding, BYO API keys, workspace CRUD | pending |
| 2 | YouTube + Brave search, resource saving | pending |
| 3 | Video player, reader-view, TipTap notes | pending |
| 4 | Polish, dark mode, landing, docs | pending |
| 5 | Public release, GitHub, Show HN | pending |

See `PROJECT.pdf` for the full specification and the detailed plan file.

## License

To be decided before public release (MIT recommended).
