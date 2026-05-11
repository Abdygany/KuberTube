'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. Try refreshing the page.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          Go home
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
