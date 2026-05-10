'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppNav } from '@/components/app-nav';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const settings = trpc.user.settings.useQuery(undefined, {
    enabled: !!session,
  });

  useEffect(() => {
    if (isPending || settings.isLoading) return;

    if (!session) {
      router.replace('/sign-in');
      return;
    }

    const onboarded = settings.data?.onboardingCompleted ?? true;
    if (!onboarded && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [isPending, session, settings.isLoading, settings.data, pathname, router]);

  if (isPending || (session && settings.isLoading)) {
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
