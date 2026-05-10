'use client';

import {
  ArrowLeft,
  BookText,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface ResourceCandidate {
  url: string;
  type: 'video' | 'article';
  source: 'youtube' | 'web';
  title: string;
  description: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
}

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function SearchDialog({
  workspaceId,
  goal,
  onSaved,
}: {
  workspaceId: string;
  goal: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(goal);
  const [results, setResults] = useState<ResourceCandidate[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const search = trpc.search.run.useMutation({
    onSuccess: (data) => setResults(data),
  });

  const createResource = trpc.resources.create.useMutation({
    onSuccess: () => {
      onSaved();
    },
  });

  async function handleSave(r: ResourceCandidate) {
    setSaving(r.url);
    await createResource.mutateAsync({
      workspaceId,
      url: r.url,
      type: r.type,
      source: r.source,
      title: r.title,
      description: r.description,
      thumbnailUrl: r.thumbnailUrl,
      durationSeconds: r.durationSeconds,
      publishedAt: r.publishedAt,
    });
    setSaving(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Search className="h-4 w-4" />
        Search resources
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle>Search resources</DialogTitle>
            <DialogDescription>
              Results come from YouTube and Brave Search. Choose what to add to your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') search.mutate({ workspaceId, query });
              }}
              placeholder="Search query…"
              className="flex-1"
            />
            <Button
              onClick={() => search.mutate({ workspaceId, query })}
              disabled={search.isPending || !query.trim()}
            >
              {search.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {search.error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {search.error.message}
            </p>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {results.length === 0 && !search.isPending && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {search.isSuccess ? 'No results found.' : 'Enter a query and search.'}
              </div>
            )}
            {results.map((r) => (
              <div
                key={r.url}
                className="flex gap-3 rounded-lg border border-border p-3 hover:border-accent/40"
              >
                {r.thumbnailUrl ? (
                  <img
                    src={r.thumbnailUrl}
                    alt=""
                    className="h-16 w-28 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded bg-secondary">
                    {r.type === 'video' ? (
                      <Play className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <BookText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{r.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {r.source}
                    </Badge>
                    {r.durationSeconds && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(r.durationSeconds)}
                      </span>
                    )}
                    {r.publishedAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 self-start"
                  onClick={() => handleSave(r)}
                  disabled={saving === r.url || createResource.isPending}
                >
                  {saving === r.url ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function WorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const ws = trpc.workspaces.get.useQuery({ id: params.id });
  const softDelete = trpc.resources.softDelete.useMutation({
    onSuccess: () => ws.refetch(),
  });
  const deleteWs = trpc.workspaces.softDelete.useMutation({
    onSuccess: () => router.replace('/workspaces'),
  });

  if (ws.isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ws.data) {
    return (
      <div className="container py-10 text-center text-muted-foreground">
        Workspace not found.{' '}
        <Link href="/workspaces" className="underline">
          Back
        </Link>
      </div>
    );
  }

  const { resources, ...workspace } = ws.data;
  const completed = resources.filter((r) => r.isCompleted).length;
  const filters = workspace.filtersJson as Record<string, string>;

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Workspaces
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{workspace.title}</h1>
            <p className="text-muted-foreground">{workspace.goal}</p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(filters).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-[10px] capitalize">
                  {v}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SearchDialog
              workspaceId={params.id}
              goal={workspace.goal}
              onSaved={() => ws.refetch()}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => deleteWs.mutate({ id: params.id })}
              title="Delete workspace"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {resources.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {completed} / {resources.length} resources completed
          </p>
        )}
      </div>

      {/* Resources */}
      {resources.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Search className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">No resources yet</p>
              <p className="text-sm text-muted-foreground">
                Search for videos and articles to add to this workspace.
              </p>
            </div>
            <SearchDialog
              workspaceId={params.id}
              goal={workspace.goal}
              onSaved={() => ws.refetch()}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className={cn(
                'group flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:border-accent/40',
                r.isCompleted && 'opacity-60',
              )}
            >
              {r.thumbnailUrl ? (
                <img
                  src={r.thumbnailUrl}
                  alt=""
                  className="h-14 w-24 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-secondary">
                  {r.type === 'video' ? (
                    <Play className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <BookText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/resources/${r.id}`}
                  className="line-clamp-2 text-sm font-medium hover:text-accent"
                >
                  {r.title}
                </Link>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {r.source}
                  </Badge>
                  {r.durationSeconds && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(r.durationSeconds)}
                    </span>
                  )}
                  {r.isCompleted && (
                    <Badge variant="accent" className="text-[10px]">
                      Completed
                    </Badge>
                  )}
                  {r.progressSeconds > 0 && !r.isCompleted && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(r.progressSeconds)} watched
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Link href={`/resources/${r.id}`}>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    {r.type === 'video' ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <BookText className="h-3.5 w-3.5" />
                    )}
                    Open
                  </Button>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => softDelete.mutate({ id: r.id })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
