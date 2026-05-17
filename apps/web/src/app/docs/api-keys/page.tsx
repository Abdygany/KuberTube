import Link from "next/link";

export default function ApiKeysGuide() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Getting API keys</h1>
        <p className="mt-2 text-muted">
          Все ключи бесплатные на базовых тарифах. Ничего не хранится у нас в
          открытом виде — ключи шифруются на бэкенде и расшифровываются только
          на время запроса к провайдеру.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-medium">
          1. YouTube Data API v3 (обязательно)
        </h2>
        <p className="mt-2 text-sm">
          10 000 quota units / день бесплатно. Один поиск стоит ~100 + 1 quota
          units (search.list + videos.list), один Re-check ключа — 1 unit.
          Хватает на ~95 поисков в день.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Откройте{" "}
            <a
              className="underline"
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Cloud Console
            </a>{" "}
            и создайте проект (или выберите существующий).
          </li>
          <li>
            В навигации → <code>APIs &amp; Services</code> →{" "}
            <code>Library</code> → найдите <strong>YouTube Data API v3</strong>{" "}
            → нажмите <strong>Enable</strong>.
          </li>
          <li>
            <code>APIs &amp; Services</code> → <code>Credentials</code> →{" "}
            <strong>Create Credentials</strong> → <strong>API key</strong>.
            Скопируйте ключ.
          </li>
          <li>
            Под ключом нажмите <strong>Edit API key</strong> →{" "}
            <strong>Restrict key</strong> → <strong>API restrictions</strong> →
            выберите только <strong>YouTube Data API v3</strong>. Сохранить.
          </li>
          <li>
            В KuberTube{" "}
            <Link className="underline" href="/app/settings">
              Settings
            </Link>{" "}
            → <strong>API keys</strong> → <strong>YouTube Data API</strong> →{" "}
            <strong>Add</strong>.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-medium">
          2. Brave Search API (обязательно)
        </h2>
        <p className="mt-2 text-sm">
          2 000 запросов / месяц бесплатно. Поддерживает русский и другие языки
          лучше, чем альтернативы.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>
            Зарегистрируйтесь на{" "}
            <a
              className="underline"
              href="https://api.search.brave.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              api.search.brave.com
            </a>
            .
          </li>
          <li>
            Перейдите в <strong>Subscriptions</strong> → выберите{" "}
            <strong>Free</strong>. Brave потребует привязать карту, но не
            списывает в пределах free tier.
          </li>
          <li>
            <strong>API Keys</strong> → <strong>+ Add API Key</strong>.
            Скопируйте subscription token.
          </li>
          <li>
            В KuberTube <strong>Settings</strong> → <strong>API keys</strong> →{" "}
            <strong>Brave Search API</strong> → <strong>Add</strong>.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-medium">3. Anthropic API (опционально)</h2>
        <p className="mt-2 text-sm">
          Нужен только для будущих AI-фич (резюме материала). Базовая работа
          продукта без него.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <a
              className="underline"
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              console.anthropic.com
            </a>{" "}
            → <strong>API Keys</strong> → <strong>Create Key</strong>.
          </li>
          <li>
            Скопируйте ключ (начинается с <code>sk-ant-</code>).
          </li>
          <li>
            <strong>Settings</strong> → <strong>API keys</strong> →{" "}
            <strong>Anthropic API</strong> → <strong>Add</strong>.
          </li>
        </ol>
      </section>

      <section className="rounded-md border border-border bg-card p-4 text-sm">
        <h3 className="font-medium">Как мы храним ключи</h3>
        <p className="mt-2 text-muted">
          На сервере: AES-256-GCM с master-ключом из переменной окружения{" "}
          <code>ENCRYPTION_KEY</code> (32 байта). Auth tag binding включает
          userId + provider — украденный ciphertext одной строки нельзя
          подсунуть в другую. Полный ключ не возвращается в API; только
          последние 4 символа.
        </p>
      </section>
    </article>
  );
}
