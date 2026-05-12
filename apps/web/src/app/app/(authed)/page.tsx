"use client";

import Link from "next/link";
import { BookOpen, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";

export default function WorkspacesListPage() {
  const list = trpc.workspaces.list.useQuery();
  const trash = trpc.workspaces.listDeleted.useQuery(undefined, {
    enabled: (list.data?.length ?? 0) > 0,
  });
  const restore = trpc.workspaces.restore.useMutation({
    onSuccess: async () => {
      await Promise.all([list.refetch(), trash.refetch()]);
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="mt-1 text-sm text-muted">Один workspace — одна фокусная сессия.</p>
        </div>
        <Button asChild>
          <Link href="/app/workspaces/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New workspace
          </Link>
        </Button>
      </header>

      {list.isLoading ? (
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-md border border-border bg-card" />
          ))}
        </ul>
      ) : list.data && list.data.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {list.data.map((workspace) => (
            <li key={workspace.id}>
              <Link
                href={`/app/workspaces/${workspace.id}`}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-background"
              >
                <BookOpen className="mt-0.5 h-4 w-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{workspace.title}</div>
                  <div className="truncate text-xs text-muted">{workspace.goal}</div>
                </div>
                <div className="text-right text-xs text-muted">
                  {new Date(workspace.lastOpenedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-muted" />
          <h2 className="mt-3 text-base font-medium">No workspaces yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Создай первый workspace — укажи тему и цель, и начни фокусную сессию.
          </p>
          <Button asChild className="mt-4">
            <Link href="/app/workspaces/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create your first workspace
            </Link>
          </Button>
        </div>
      )}

      {trash.data && trash.data.length > 0 ? (
        <details className="mt-10 [&_summary]:cursor-pointer">
          <summary className="inline-flex items-center gap-2 text-xs text-muted transition hover:text-foreground">
            <Trash2 className="h-3.5 w-3.5" />
            Trash ({trash.data.length}) — soft-deleted workspaces, restore anytime
          </summary>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-card">
            {trash.data.map((workspace) => (
              <li key={workspace.id} className="flex items-start gap-3 px-4 py-3">
                <Trash2 className="mt-0.5 h-4 w-4 text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{workspace.title}</div>
                  <div className="truncate text-xs text-muted">{workspace.goal}</div>
                  <div className="mt-1 text-[11px] text-muted">
                    deleted {workspace.deletedAt ? new Date(workspace.deletedAt).toLocaleString() : "—"}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => restore.mutate({ id: workspace.id })}
                  disabled={restore.isPending}
                  className="h-8 px-2 text-xs"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
