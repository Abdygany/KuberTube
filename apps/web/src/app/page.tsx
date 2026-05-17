import { BookOpen, KeyRound, Search, ShieldOff } from "lucide-react";
import Link from "next/link";
import { Disclosure } from "@/components/ui/disclosure";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="space-y-4">
        <p className="text-xs uppercase tracking-widest text-muted">
          KuberTube
        </p>
        <h1 className="text-balance text-3xl font-semibold leading-tight md:text-5xl">
          Учебный workspace для целенаправленного изучения тем — без
          рекомендаций, лент и автоплея.
        </h1>
        <p className="text-balance text-base text-muted md:text-lg">
          Продукт не борется за внимание пользователя — он его защищает. Это не
          «ещё один AI-помощник для обучения». Это место, куда приходят с
          намерением изучить что-то.
        </p>
      </header>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm">
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
        <Link
          href="/docs"
          className="rounded-md border border-border px-4 py-2 font-medium transition hover:bg-card"
        >
          Docs
        </Link>
      </nav>

      <section className="mt-20 space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted">
          The problem
        </h2>
        <p className="text-base leading-relaxed">
          Хочешь разобраться в трансформерах к завтрашнему семинару — открываешь
          YouTube. Через двадцать минут ты смотришь, как кот играет на пианино.
          Сорок минут на поиск двух годных статей, ещё двадцать минут — на
          возврат к теме.
        </p>
        <p className="text-base leading-relaxed text-muted">
          Это не дефект самоконтроля, это работа алгоритма. Платформы
          зарабатывают на твоём времени и оптимизируют интерфейс под удержание.
          У учебного намерения нет шансов.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted">
          How KuberTube works
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Feature
            icon={<BookOpen className="h-5 w-5" />}
            title="One workspace = one focus session"
            body="Создаёшь workspace под конкретную цель — приложение фильтрует материалы по уровню, длительности и свежести. Никаких «возможно, вам понравится»."
          />
          <Feature
            icon={<Search className="h-5 w-5" />}
            title="Curated, not ranked"
            body="YouTube + Brave Search через твои API-ключи. Алгоритм только фильтрует, не ранжирует. Ты сам решаешь, что добавить в workspace."
          />
          <Feature
            icon={<ShieldOff className="h-5 w-5" />}
            title="No recommendations"
            body="YouTube IFrame с rel=0 / modestbranding=1 и перехватом ended → stopVideo. Никаких похожих видео, никакого автоплея."
          />
          <Feature
            icon={<KeyRound className="h-5 w-5" />}
            title="BYO API keys"
            body="Ключи шифруются на сервере (AES-256-GCM) с уникальным AAD на каждого пользователя. Open source — можно развернуть у себя."
          />
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted">
          FAQ
        </h2>
        <Disclosure question="Что мне нужно, чтобы начать?">
          Зарегистрироваться и добавить два бесплатных API-ключа: YouTube Data
          API (10k запросов/день free) и Brave Search (2000 запросов/мес free).
          Anthropic — опционально, для AI-резюме в будущих фазах.
        </Disclosure>
        <Disclosure question="Реклама в видео YouTube — есть?">
          Да, на монетизированных видео реклама остаётся — YouTube IFrame API её
          не отключает. Мы предпочитаем академические каналы в подборке, но
          обещать «полностью без рекламы» нечестно.
        </Disclosure>
        <Disclosure question="Куда уходят данные?">
          Email, заметки, метаданные ресурсов — в твою БД (или в нашу, если
          используешь хостинг). Содержимое статей не сохраняется (copyright).
          API-ключи зашифрованы AES-256-GCM с per-row AAD.
        </Disclosure>
        <Disclosure question="Это open source?">
          Да. MIT-лицензия, код на GitHub. Можно self-host через Docker Compose
          — см. /docs.
        </Disclosure>
      </section>

      <footer className="mt-20 border-t border-border pt-6 text-xs text-muted">
        Open-source. BYO API keys. No tracking, no ads, no recommendations.
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-muted">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </article>
  );
}
