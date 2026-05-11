import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-4xl leading-tight tracking-tight">Learnspace</h1>
      <p className="mt-4 text-lg" style={{ color: 'var(--color-fg-muted)' }}>
        Учебный workspace, защищающий намерение учиться. Без рекомендаций, автоплея и бесконечных
        лент.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-md border px-5 py-2 text-sm transition-colors hover:bg-[var(--color-card)]"
        >
          Войти
        </Link>
        <Link
          href="/sign-up"
          className="rounded-md px-5 py-2 text-sm text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          Создать аккаунт
        </Link>
      </div>
      <p className="mt-12 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Статус: Фаза 0 — настройка окружения. Полный функционал — впереди.
      </p>
    </main>
  );
}
