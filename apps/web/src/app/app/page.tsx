'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

export default function AppHome() {
  const router = useRouter();
  const session = authClient.useSession();
  const enabled = Boolean(session.data?.user);
  const settings = trpc.settings.get.useQuery(undefined, { enabled });
  const workspaces = trpc.workspaces.list.useQuery(undefined, { enabled });

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace('/sign-in');
    }
  }, [session.isPending, session.data, router]);

  useEffect(() => {
    if (settings.data && !settings.data.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [settings.data, router]);

  if (session.isPending || !session.data?.user) return null;

  const items = workspaces.data ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Workspaces</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/settings/keys"
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Ключи
          </Link>
          <button
            onClick={async () => {
              await authClient.signOut();
              router.replace('/');
            }}
            className="underline"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="mt-10">
        <Link
          href="/app/workspaces/new"
          className="inline-block rounded-md px-4 py-2 text-sm text-white"
          style={{ background: 'var(--color-accent)' }}
        >
          Создать workspace
        </Link>
      </div>

      {workspaces.isPending && (
        <p className="mt-6 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Загружаем…
        </p>
      )}

      {!workspaces.isPending && items.length === 0 && (
        <p className="mt-10 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Создайте первый workspace, чтобы начать.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-8 space-y-2">
          {items.map((w) => (
            <li key={w.id}>
              <Link
                href={`/app/workspaces/${w.id}`}
                className="block rounded-md border bg-[var(--color-card)] px-4 py-3 transition-colors hover:border-[var(--color-accent)]"
              >
                <div className="font-medium">{w.title}</div>
                <div className="mt-1 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
                  {w.goal}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
