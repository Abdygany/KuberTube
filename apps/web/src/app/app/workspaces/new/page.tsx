'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

type Level = 'beginner' | 'intermediate' | 'advanced';
type Duration = 'short' | 'medium' | 'long';
type Balance = 'video' | 'text' | 'mixed';
type Freshness = 'any' | '6m' | '1y' | '2y';

export default function NewWorkspacePage() {
  const router = useRouter();
  const session = authClient.useSession();
  const utils = trpc.useUtils();
  const settings = trpc.settings.get.useQuery(undefined, {
    enabled: Boolean(session.data?.user),
  });
  const create = trpc.workspaces.create.useMutation();

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [level, setLevel] = useState<Level | ''>('');
  const [duration, setDuration] = useState<Duration | ''>('');
  const [balance, setBalance] = useState<Balance | ''>('');
  const [freshness, setFreshness] = useState<Freshness | ''>('');
  const [error, setError] = useState<string | null>(null);

  if (!session.isPending && !session.data?.user) {
    router.replace('/sign-in');
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = await create.mutateAsync({
        title: title.trim(),
        goal: goal.trim(),
        filters: advanced
          ? {
              ...(level ? { level } : {}),
              ...(duration ? { duration } : {}),
              ...(balance ? { balance } : {}),
              ...(freshness ? { freshness } : {}),
            }
          : undefined,
      });
      await utils.workspaces.list.invalidate();
      router.replace(`/app/workspaces/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать workspace.');
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header>
        <Link href="/app" className="text-sm underline" style={{ color: 'var(--color-fg-muted)' }}>
          ← К workspace'ам
        </Link>
        <h1 className="mt-4 font-serif text-3xl">Новый workspace</h1>
      </header>

      <form onSubmit={onSubmit} className="mt-10 space-y-6">
        <label className="block">
          <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Тема
          </span>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: трансформеры"
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Цель сессии
          </span>
          <textarea
            required
            maxLength={2000}
            rows={3}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Что хотите вынести из этого workspace?"
            className="w-full rounded-md border bg-[var(--color-card)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <details
          open={advanced}
          onToggle={(e) => setAdvanced((e.target as HTMLDetailsElement).open)}
          className="rounded-md border bg-[var(--color-card)] p-4"
        >
          <summary className="cursor-pointer text-sm">Дополнительно</summary>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
            Переопределить дефолты профиля для этого workspace. Иначе подберём по вашим настройкам.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Select<Level>
              label="Уровень"
              value={level}
              onChange={setLevel}
              options={[
                { value: '', label: `По дефолту (${settings.data?.defaultLevel ?? '—'})` },
                { value: 'beginner', label: 'Новичок' },
                { value: 'intermediate', label: 'Средний' },
                { value: 'advanced', label: 'Продвинутый' },
              ]}
            />
            <Select<Duration>
              label="Длительность"
              value={duration}
              onChange={setDuration}
              options={[
                { value: '', label: `По дефолту (${settings.data?.defaultDuration ?? '—'})` },
                { value: 'short', label: 'Короткая' },
                { value: 'medium', label: 'Средняя' },
                { value: 'long', label: 'Длинная' },
              ]}
            />
            <Select<Balance>
              label="Баланс"
              value={balance}
              onChange={setBalance}
              options={[
                { value: '', label: `По дефолту (${settings.data?.defaultBalance ?? '—'})` },
                { value: 'video', label: 'Скорее видео' },
                { value: 'text', label: 'Скорее текст' },
                { value: 'mixed', label: 'Поровну' },
              ]}
            />
            <Select<Freshness>
              label="Актуальность"
              value={freshness}
              onChange={setFreshness}
              options={[
                { value: '', label: `По дефолту (${settings.data?.defaultFreshness ?? '—'})` },
                { value: 'any', label: 'Без ограничений' },
                { value: '2y', label: '2 года' },
                { value: '1y', label: '1 год' },
                { value: '6m', label: '6 месяцев' },
              ]}
            />
          </div>
        </details>

        {error && (
          <p className="text-sm" role="alert" style={{ color: '#dc2626' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-md px-5 py-2 text-sm text-white disabled:opacity-50"
          style={{ background: 'var(--color-accent)' }}
        >
          {create.isPending ? 'Создаём…' : 'Создать'}
        </button>
      </form>
    </main>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | '';
  onChange: (v: T | '') => void;
  options: { value: T | ''; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs" style={{ color: 'var(--color-fg-muted)' }}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | '')}
        className="w-full rounded-md border bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
