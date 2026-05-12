export default function SelfHostGuide() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Self-host</h1>
        <p className="mt-2 text-muted">
          KuberTube — open-source. Можно поднять локально (Docker Compose) или на любом VPS с
          Postgres.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-medium">Prerequisites</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li>Node.js 20 LTS</li>
          <li>pnpm 9 (<code>corepack enable</code>)</li>
          <li>Docker (для локального Postgres)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-medium">Local development</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-card p-4 text-xs">
{`# 1. Clone и зависимости
git clone https://github.com/Abdygany/KuberTube.git
cd KuberTube
pnpm install

# 2. Скопировать env
cp .env.example .env

# 3. Сгенерировать секреты:
#    BETTER_AUTH_SECRET (32 байта base64):
openssl rand -base64 32
#    ENCRYPTION_KEY (32 байта hex):
openssl rand -hex 32

# 4. Поднять Postgres + миграции
docker compose up -d
pnpm db:generate
pnpm db:migrate

# 5. Запустить web (:3000) и api (:3001)
pnpm dev`}
        </pre>
      </section>

      <section>
        <h2 className="text-xl font-medium">Production deploy</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>
            <strong>Frontend</strong>: Vercel — связать репозиторий, root <code>apps/web</code>, env
            переменные <code>NEXT_PUBLIC_API_URL</code>.
          </li>
          <li>
            <strong>Backend</strong>: Railway — <code>apps/api</code>, Dockerfile, env переменные
            <code>DATABASE_URL</code>, <code>BETTER_AUTH_SECRET</code>, <code>ENCRYPTION_KEY</code>,
            <code>WEB_URL</code>.
          </li>
          <li>
            <strong>Postgres</strong>: managed на Railway или Neon. Применить миграции через{" "}
            <code>pnpm db:migrate</code>.
          </li>
          <li>
            <strong>DNS</strong>: Cloudflare для проксирования и базовой защиты.
          </li>
        </ul>
      </section>

      <section className="rounded-md border border-border bg-card p-4 text-sm">
        <h3 className="font-medium">Backups</h3>
        <p className="mt-2 text-muted">
          Бэкапить надо Postgres (юзеры, workspaces, ресурсы, заметки). Контент статей в БД не
          хранится — он fetch-ится через reader-mode из источников. Master-ключ{" "}
          <code>ENCRYPTION_KEY</code> хранить отдельно (как, например, в Doppler или 1Password) — без
          него зашифрованные ключи пользователей нельзя восстановить.
        </p>
      </section>
    </article>
  );
}
