# Learnspace

**Distraction-free learning workspace for students.**  
No recommendations. No autoplay. No feeds. No streaks. Just focused sessions on the topic you actually came to learn.

You bring your own API keys (YouTube Data API v3 + Brave Search). Keys are encrypted with AES-256-GCM on the server — Learnspace never proxies your traffic or stores your keys in plaintext.

---

## Features

- **Workspaces** — create a workspace around a learning goal; search YouTube + the web in parallel
- **BYO keys** — YouTube Data API v3 and Brave Search keys stored per-user, encrypted at rest
- **Video viewer** — YouTube IFrame player with `rel=0`, no recommendations on end, progress resume
- **Reader view** — Mozilla Readability-powered article rendering with Source Serif typography
- **TipTap notes** — markdown notes per resource, auto-saved, video timecode insertion
- **Onboarding** — 5-step preference wizard sets search defaults (level, duration, balance, freshness)
- **Settings** — profile, theme (light/dark/system), search defaults, API key management
- **Trash** — soft-delete with 30-day recovery window, automated cron cleanup
- **Docs** — `/docs` with setup guides for YouTube key, Brave key, and self-hosting

---

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm 9, Turborepo 2 |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS 3, TanStack Query 5, tRPC client |
| Backend | Hono 4, tRPC 11, Better Auth 1, Drizzle ORM 0.36, PostgreSQL 16 |
| Packages | `@learnspace/db` (schema + client), `@learnspace/core` (AES-256-GCM encryption), `@learnspace/api-types` |
| Search | YouTube Data API v3, Brave Search API (parallel, 24h SHA-256 cache) |
| Article | Mozilla Readability + JSDOM (server-side) |
| Notes | TipTap (StarterKit + Placeholder) |
| Hosting | Railway (api + Postgres), Vercel (web) |

---

## Repository structure

```
apps/
  web/          Next.js 15 app (landing, auth, workspaces, docs)
  api/          Hono backend (Better Auth + tRPC + cron)
packages/
  db/           Drizzle schema, client, migrations
  api-types/    Shared AppRouter type export
  core/         AES-256-GCM encryption helper
  config/       Shared TS / ESLint / Tailwind presets
docker-compose.yml   Local Postgres 16
```

---

## Local development

**Prerequisites:** Node 20+, pnpm 9+, Docker Desktop.

```bash
# 1. Clone and install
git clone https://github.com/abdygany/kubertube
cd kubertube
pnpm install

# 2. Start Postgres
docker compose up -d

# 3. Configure environment
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env`:

```dotenv
DATABASE_URL=postgresql://learnspace:learnspace@localhost:5432/learnspace
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3001
ENCRYPTION_KEY=<openssl rand -hex 32>     # exactly 64 hex chars
WEB_ORIGIN=http://localhost:3000
CRON_SECRET=<openssl rand -hex 32>        # optional, protects /api/cron/cleanup
```

Edit `apps/web/.env`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
# 4. Push DB schema
pnpm db:push

# 5. Start everything (api → :3001, web → :3000)
pnpm dev
```

Open <http://localhost:3000>, sign up, complete onboarding, add your API keys in Settings, then create your first workspace.

---

## API keys setup

See [/docs/get-api-keys](http://localhost:3000/docs/get-api-keys) for step-by-step instructions.

**Short version:**
- **YouTube Data API v3** — Google Cloud Console → create project → enable YouTube Data API v3 → create API key → restrict to YouTube Data API v3
- **Brave Search API** — <https://brave.com/search/api/> → free tier includes 2,000 queries/month

Keys are encrypted client-side before storage; the server only holds the ciphertext.

---

## Self-hosting

See [/docs/self-host](http://localhost:3000/docs/self-host) for Railway + Vercel deployment instructions and the Docker Compose reference.

**Automated cleanup cron (Railway):**

Configure a Railway cron job to POST daily:

```
POST https://your-api.railway.app/api/cron/cleanup
Authorization: Bearer <CRON_SECRET>
```

This hard-deletes workspaces, resources, and notes soft-deleted more than 30 days ago.

---

## Implementation roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Monorepo scaffolding, auth, CI | **complete** |
| 1 | Onboarding, BYO API keys, workspace CRUD | **complete** |
| 2 | YouTube + Brave search, resource saving | **complete** |
| 3 | Video player, reader-view, TipTap notes | **complete** |
| 4 | Polish, dark mode, landing page, /docs, trash | **complete** |
| 5 | License, cron cleanup, onboarding flow, README | **complete** |

---

## UX principles (non-negotiable)

1. No recommendations
2. No autoplay
3. No infinite feed (pagination only)
4. No intrusive notifications
5. No automatic pushes
6. No streaks / badges / XP
7. Fast escape — no "are you sure?" on every action
8. No dark patterns
9. Closed system — only what the user intentionally added

---

## License

MIT — see [LICENSE](./LICENSE).
