'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppNav } from '@/components/app-nav';
import { useSession } from '@/lib/auth-client';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/sign-in');
    }
  }, [isPending, session, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      {children}
    </div>
  );
}
