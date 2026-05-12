import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-widest text-muted">KuberTube</p>
        <h1 className="text-balance text-3xl font-semibold leading-tight md:text-4xl">
          Учебный workspace для целенаправленного изучения тем — без рекомендаций, лент и
          автоплея.
        </h1>
        <p className="text-muted">
          Продукт не борется за внимание пользователя — он его защищает.
        </p>
      </header>

      <nav className="flex gap-3 text-sm">
        <Link
          href="/sign-up"
          className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition hover:opacity-90"
        >
          Sign up
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-border px-4 py-2 font-medium transition hover:bg-card"
        >
          Sign in
        </Link>
      </nav>
    </main>
  );
}
