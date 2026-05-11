'use client';

import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';

export default function TrashPage() {
  const utils = trpc.useUtils();
  const deleted = trpc.workspaces.listDeleted.useQuery();
  const restore = trpc.workspaces.restore.useMutation({
    onSuccess: () => {
      utils.workspaces.list.invalidate();
      utils.workspaces.listDeleted.invalidate();
      toast.success('Workspace restored');
    },
    onError: (e) => toast.error(e.message),
  });

  if (deleted.isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = deleted.data ?? [];

  return (
    <div className="container max-w-2xl space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Deleted workspaces are permanently removed after 30 days.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Trash is empty.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((ws) => {
            const deletedAt = ws.deletedAt ? new Date(ws.deletedAt) : null;
            const expiresAt = deletedAt
              ? new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
              : null;
            const daysLeft = expiresAt
              ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              : null;

            return (
              <Card key={ws.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium">{ws.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{ws.goal}</p>
                    {daysLeft !== null && (
                      <p className="text-xs text-destructive">
                        Permanently deleted in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => restore.mutate({ id: ws.id })}
                    disabled={restore.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
