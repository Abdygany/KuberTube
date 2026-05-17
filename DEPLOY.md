# Deploying KuberTube on Railway

End-to-end deploy on a single Railway project: Postgres + api + web +
nightly cleanup cron.

## Prerequisites

- Railway account with billing enabled (free tier is enough to start).
- Forked / cloned `Abdygany/KuberTube` repo on GitHub.

## 1. Create the project + Postgres

1. Railway dashboard → **New Project** → **Deploy from GitHub repo**.
2. Pick the `KuberTube` repository.
3. Once the project is created, **+ New** → **Database** → **Add PostgreSQL**.
   Railway provisions a managed Postgres 16 and exposes `DATABASE_URL`
   automatically to any service in this project.

## 2. Set up the `api` service

The repo includes a `railway.toml` declaring services, but Railway needs you
to actually click through them in the dashboard. For each service below, set
the Dockerfile path explicitly.

1. From the project page: **+ New** → **GitHub Repo** → pick the same
   `KuberTube` repo.
2. Name it `api`.
3. **Settings** → **Build**:
   - Builder: `Dockerfile`
   - Dockerfile path: `apps/api/Dockerfile`
   - Root directory: `/` (build context is the repo root — the Dockerfile
     needs the monorepo layout).
4. **Settings** → **Variables**:
   - `DATABASE_URL` → reference the Postgres plugin (click the **Reference**
     button, pick `Postgres` → `DATABASE_URL`).
   - `BETTER_AUTH_SECRET` → generate with `openssl rand -base64 32`.
   - `ENCRYPTION_KEY` → generate with `openssl rand -hex 32`. **Save this
     value somewhere safe** — losing it makes every encrypted API key in
     the DB unreadable forever.
   - `BETTER_AUTH_URL` → leave blank for now; set after step 4 below.
   - `WEB_URL` → leave blank for now.
5. **Settings** → **Networking** → **Generate Domain**. Note the assigned
   URL (e.g. `kubertube-api-production.up.railway.app`).
6. Update `BETTER_AUTH_URL` to `https://<that-domain>`.
7. **Settings** → **Deploy** → **Healthcheck Path**: `/health/ready`.
8. Deploy. The Docker build takes ~3–5 minutes the first time.

## 3. Apply migrations

Once the api container is up, exec into it once:

- **api service** → **Settings** → **Run a command** (or use Railway CLI):
  ```bash
  pnpm --filter @kubertube/db db:migrate
  ```

This creates all tables/enums/indexes from `0000_initial.sql`.

(Subsequent deploys can run migrations automatically via the
`preDeployCommand` in `railway.toml`. Set it once the migration story is
stable.)

## 4. Set up the `web` service

1. **+ New** → **GitHub Repo** → same repo, name it `web`.
2. **Settings** → **Build**:
   - Builder: `Dockerfile`
   - Dockerfile path: `apps/web/Dockerfile`
   - Root directory: `/`
3. **Settings** → **Variables**:
   - `NEXT_PUBLIC_API_URL` → `https://<api-domain>` from step 2.5.
4. **Settings** → **Networking** → **Generate Domain**. Note the URL.
5. Deploy.
6. Go back to the **api** service variables and set `WEB_URL` to the web
   domain (this gates CORS). Redeploy the api service so it picks up the
   change.

## 5. Add the cleanup cron

1. **+ New** → **GitHub Repo** → same repo, name it `cleanup`.
2. **Settings** → **Build**:
   - Builder: `Dockerfile`
   - Dockerfile path: `apps/api/Dockerfile` (reuses the api image).
3. **Settings** → **Variables**:
   - `DATABASE_URL` → reference Postgres.
   - `SOFT_DELETE_RETENTION_DAYS` → `30` (or your preferred retention).
4. **Settings** → **Service** → **Cron Schedule**: `0 3 * * *` (03:00 UTC
   daily — adjust to your time zone).
5. **Settings** → **Service** → **Start Command**:
   `pnpm --filter @kubertube/db db:cleanup`.
6. Save.

## 6. Smoke test

- `curl https://<api-domain>/health` → `{"ok":true,"service":"kubertube-api"}`
- `curl https://<api-domain>/health/ready` → `{"ok":true,"db":"ok",…}` (502 if DB unreachable).
- Open `https://<web-domain>/` → landing page.
- Sign up → enter YouTube + Brave API keys in Settings (see `/docs/api-keys`).
- Create a workspace → click **Run search** → cards appear.

## DNS (optional)

Cloudflare or another DNS provider can be configured to point your custom
domain at the Railway-assigned URLs. Update `BETTER_AUTH_URL`, `WEB_URL`,
and `NEXT_PUBLIC_API_URL` to your custom domains and redeploy.

## Cost expectations

- Postgres add-on: ~$5/mo on starter usage.
- Two app services (api + web): ~$5/mo each when idle (Railway charges on
  CPU + RAM-hours).
- Cleanup cron: pennies — runs for ~10s a day.

Total: roughly $15–20/mo for a small instance, scaling with traffic.
