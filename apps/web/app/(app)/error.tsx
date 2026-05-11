'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function AppError({
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
    <div className="container flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">
          {error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}
