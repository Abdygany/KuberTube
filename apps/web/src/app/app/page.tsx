'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

export default function AppHome() {
  const router = useRouter();
  const session = authClient.useSession();
  const me = trpc.me.whoami.useQuery(undefined, { enabled: Boolean(session.data?.user) });

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      router.replace('/sign-in');
    }
  }, [session.isPending, session.data, router]);

  if (session.isPending) return null;
  if (!session.data?.user) return null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl">Workspaces</h1>
        <button
          onClick={async () => {
            await authClient.signOut();
            router.replace('/');
          }}
          className="text-sm underline"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Выйти
        </button>
      </header>

      <section className="mt-12 rounded-md border bg-[var(--color-card)] p-6">
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Привет, {me.data?.name || session.data.user.name || session.data.user.email}.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Список workspace'ов появится в Фазе 1.
        </p>
      </section>
    </main>
  );
}
