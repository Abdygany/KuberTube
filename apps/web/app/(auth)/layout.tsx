'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useSession } from '@/lib/auth-client';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.replace('/workspaces');
    }
  }, [isPending, session, router]);

  return (
    <main className="container flex min-h-screen items-center justify-center py-16">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
