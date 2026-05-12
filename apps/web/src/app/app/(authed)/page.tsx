"use client";

import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";

export default function WorkspacesListPage() {
  const list = trpc.workspaces.list.useQuery();

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
        <p className="text-sm text-muted">Loading...</p>
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
    </div>
  );
}
