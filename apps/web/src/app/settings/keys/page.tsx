'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '@learnspace/api';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

type Provider = 'youtube' | 'brave' | 'anthropic';
type StoredKey = inferRouterOutputs<AppRouter>['apiKeys']['list'][number];

const PROVIDERS: { value: Provider; label: string; help: string }[] = [
  {
    value: 'youtube',
    label: 'YouTube Data API v3',
    help: 'Получить: https://console.cloud.google.com → APIs & Services → Credentials.',
  },
  {
    value: 'brave',
    label: 'Brave Search API',
    help: 'Получить: https://api.search.brave.com — 2000 запросов в месяц бесплатно.',
  },
  {
    value: 'anthropic',
    label: 'Anthropic API (опционально)',
    help: 'Только для AI-резюме. Получить: https://console.anthropic.com.',
  },
];

export default function KeysPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const utils = trpc.useUtils();
  const keys = trpc.apiKeys.list.useQuery(undefined, {
    enabled: Boolean(session.data?.user),
  });

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace('/sign-in');
    }
  }, [session.isPending, session.data, router]);

  if (session.isPending || !session.data?.user) return null;

  const byProvider = new Map(keys.data?.map((k) => [k.provider, k]) ?? []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">API-ключи</h1>
        <Link href="/app" className="text-sm underline" style={{ color: 'var(--color-fg-muted)' }}>
          К workspace'ам
        </Link>
      </header>
      <p className="mt-4 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        Ключи шифруются AES-256-GCM перед сохранением. Plaintext-ключ не виден после ввода —
        отображаются только метаданные.
      </p>

      <section className="mt-10 space-y-6">
        {PROVIDERS.map((p) => (
          <ProviderCard
            key={p.value}
            provider={p.value}
            label={p.label}
            help={p.help}
            stored={byProvider.get(p.value)}
            onChanged={() => utils.apiKeys.list.invalidate()}
          />
        ))}
      </section>
    </main>
  );
}

function ProviderCard({
  provider,
  label,
  help,
  stored,
  onChanged,
}: {
  provider: Provider;
  label: string;
  help: string;
  stored?: StoredKey;
  onChanged: () => void;
}) {
  const [value, setValue] = useState('');
  const [editing, setEditing] = useState(!stored);
  const [feedback, setFeedback] = useState<string | null>(null);

  const save = trpc.apiKeys.save.useMutation();
  const remove = trpc.apiKeys.delete.useMutation();
  const validate = trpc.apiKeys.validate.useMutation();

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setFeedback(null);
    await save.mutateAsync({ provider, key: value.trim() });
    setValue('');
    setEditing(false);
    onChanged();
  }

  async function onValidate() {
    setFeedback(null);
    const result = await validate.mutateAsync({ provider });
    setFeedback(result.valid ? 'Ключ принят провайдером.' : `Не принят: ${result.reason}`);
    onChanged();
  }

  async function onDelete() {
    setFeedback(null);
    await remove.mutateAsync({ provider });
    setEditing(true);
    onChanged();
  }

  return (
    <article className="rounded-md border bg-[var(--color-card)] p-5">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium">{label}</h2>
        {stored && (
          <span className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
            {stored.isValid ? 'валиден' : 'не проверен'}
            {stored.lastValidatedAt
              ? ` · проверен ${new Date(stored.lastValidatedAt).toLocaleString('ru')}`
              : ''}
          </span>
        )}
      </header>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
        {help}
      </p>

      {editing ? (
        <form onSubmit={onSave} className="mt-4 flex gap-2">
          <input
            type="password"
            placeholder="Вставьте ключ"
            required
            minLength={8}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-md border bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-md px-4 py-2 text-sm text-white disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {save.isPending ? 'Сохраняем…' : 'Сохранить'}
          </button>
          {stored && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Отмена
            </button>
          )}
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onValidate}
            disabled={validate.isPending}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {validate.isPending ? 'Проверяем…' : 'Проверить'}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            Заменить
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={remove.isPending}
            className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Удалить
          </button>
        </div>
      )}

      {feedback && (
        <p className="mt-3 text-sm" role="status" style={{ color: 'var(--color-fg-muted)' }}>
          {feedback}
        </p>
      )}
    </article>
  );
}
