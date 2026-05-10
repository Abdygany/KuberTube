'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

export default function WorkspacesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const health = trpc.health.useQuery();

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <main className="container space-y-8 py-10">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {session?.user?.email}
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      <section className="rounded-lg border border-dashed p-10 text-center">
        <h2 className="text-lg font-medium">No workspaces yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace creation is part of Phase 1. The API is reachable —{' '}
          {health.data ? 'health check OK' : 'connecting…'}.
        </p>
      </section>
    </main>
  );
}
