'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = authClient.useSession();
  const utils = trpc.useUtils();
  const workspace = trpc.workspaces.get.useQuery(
    { id: params.id },
    { enabled: Boolean(session.data?.user && params.id) },
  );
  const softDelete = trpc.workspaces.softDelete.useMutation();

  if (!session.isPending && !session.data?.user) {
    router.replace('/sign-in');
    return null;
  }

  if (workspace.isPending) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Загружаем…
        </p>
      </main>
    );
  }

  if (workspace.error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/app" className="text-sm underline" style={{ color: 'var(--color-fg-muted)' }}>
          ← К workspace'ам
        </Link>
        <p className="mt-6 text-sm">Workspace не найден.</p>
      </main>
    );
  }

  const w = workspace.data!;

  async function onDelete() {
    await softDelete.mutateAsync({ id: w.id });
    await utils.workspaces.list.invalidate();
    router.replace('/app');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header>
        <Link href="/app" className="text-sm underline" style={{ color: 'var(--color-fg-muted)' }}>
          ← К workspace'ам
        </Link>
        <h1 className="mt-4 font-serif text-3xl">{w.title}</h1>
        <p className="mt-2" style={{ color: 'var(--color-fg-muted)' }}>
          {w.goal}
        </p>
      </header>

      <section className="mt-10 rounded-md border bg-[var(--color-card)] p-6">
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          В этом workspace пока нет ресурсов. Поиск и подборка появятся в Фазе 2.
        </p>
      </section>

      <footer className="mt-10">
        <button
          type="button"
          onClick={onDelete}
          disabled={softDelete.isPending}
          className="text-sm underline disabled:opacity-50"
          style={{ color: 'var(--color-fg-muted)' }}
        >
          Удалить workspace
        </button>
        <p className="mt-1 text-xs" style={{ color: 'var(--color-fg-muted)' }}>
          Восстановить можно в течение 30 дней.
        </p>
      </footer>
    </main>
  );
}
