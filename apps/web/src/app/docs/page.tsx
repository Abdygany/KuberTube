import Link from "next/link";

export default function DocsIndex() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Documentation</h1>
        <p className="mt-2 text-muted">
          KuberTube — open-source учебный workspace. Чтобы продукт заработал,
          нужно подключить два собственных API-ключа: YouTube Data API и Brave
          Search.
        </p>
      </header>

      <section>
        <h2 className="text-lg font-medium">Start here</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link className="underline" href="/docs/api-keys">
              How to get API keys
            </Link>
            <span className="text-muted">
              {" "}
              — пошаговая инструкция для YouTube + Brave + Anthropic.
            </span>
          </li>
          <li>
            <Link className="underline" href="/docs/self-host">
              Self-host
            </Link>
            <span className="text-muted">
              {" "}
              — Docker Compose локально или на своём сервере.
            </span>
          </li>
          <li>
            <Link className="underline" href="/docs/faq">
              FAQ
            </Link>
            <span className="text-muted"> — частые вопросы.</span>
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-medium">Quick architecture</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Next.js 15 frontend + Hono backend + Drizzle/Postgres.</li>
          <li>tRPC между ними; Better Auth для регистрации.</li>
          <li>
            API-ключи зашифрованы AES-256-GCM с уникальным AAD на пользователя.
          </li>
          <li>
            Поиск: YouTube Data API (1 + 100 quota units на запрос) + Brave
            Search.
          </li>
          <li>Reader-mode через Mozilla Readability с защитой от SSRF.</li>
        </ul>
      </section>
    </article>
  );
}
