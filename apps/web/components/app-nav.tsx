'use client';

import { BookOpen, LogOut, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.replace('/sign-in');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <nav className="flex items-center gap-1">
          <Link
            href="/workspaces"
            className="mr-4 flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <BookOpen className="h-4 w-4 text-accent" />
            Learnspace
          </Link>
          <Link
            href="/workspaces"
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-secondary',
              pathname.startsWith('/workspaces') && !pathname.startsWith('/workspaces/')
                ? 'bg-secondary font-medium'
                : 'text-muted-foreground',
            )}
          >
            Workspaces
          </Link>
        </nav>
        <div className="flex items-center gap-1">
          <Link
            href="/trash"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-secondary',
              pathname === '/trash' ? 'bg-secondary font-medium' : 'text-muted-foreground',
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Trash
          </Link>
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-secondary',
              pathname === '/settings' ? 'bg-secondary font-medium' : 'text-muted-foreground',
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5 text-muted-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
