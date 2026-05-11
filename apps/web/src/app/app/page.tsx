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
  const me = trpc.me.whoami.useQuery(undefined, { enabled });

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

      <section className="mt-12 rounded-md border bg-[var(--color-card)] p-6">
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Привет, {me.data?.name || session.data.user.name || session.data.user.email}.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Список workspace'ов появится в C12. Сначала добавьте API-ключи на странице «Ключи».
        </p>
      </section>
    </main>
  );
}
