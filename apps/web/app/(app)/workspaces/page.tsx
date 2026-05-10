'use client';

import { BookOpen, Loader2, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function CreateWorkspaceDialog() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [level, setLevel] = useState<string>('intermediate');
  const [duration, setDuration] = useState<string>('medium');
  const [balance, setBalance] = useState<string>('mixed');
  const [freshness, setFreshness] = useState<string>('any');

  const create = trpc.workspaces.create.useMutation({
    onSuccess: (ws) => {
      utils.workspaces.list.invalidate();
      setOpen(false);
      router.push(`/workspaces/${ws.id}`);
    },
  });

  const settings = trpc.user.settings.useQuery();

  function handleOpen(v: boolean) {
    setOpen(v);
    if (v && settings.data) {
      setLevel(settings.data.defaultLevel);
      setDuration(settings.data.defaultDuration);
      setBalance(settings.data.defaultBalance);
      setFreshness(settings.data.defaultFreshness);
    }
    if (!v) {
      setTitle('');
      setGoal('');
      setShowFilters(false);
    }
  }

  function handleCreate() {
    if (!title.trim() || !goal.trim()) return;
    create.mutate({
      title: title.trim(),
      goal: goal.trim(),
      filters: { level: level as 'beginner' | 'intermediate' | 'advanced', duration: duration as 'short' | 'medium' | 'long', balance: balance as 'video' | 'text' | 'mixed', freshness: freshness as 'any' | '6m' | '1y' | '2y' },
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
          <DialogDescription>
            Define your learning goal. The more specific, the better the results.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ws-title">Title</Label>
            <Input
              id="ws-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Understanding Transformers"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-goal">Learning goal</Label>
            <Textarea
              id="ws-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Understand how attention mechanisms work in transformer models to prepare for tomorrow's seminar"
              rows={3}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="transition-transform" style={{ display: 'inline-block', transform: showFilters ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              ▸
            </span>
            Additional filters
          </button>

          {showFilters && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              {[
                {
                  id: 'level', label: 'Level', value: level, onChange: setLevel,
                  options: [{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Intermediate' }, { value: 'advanced', label: 'Advanced' }],
                },
                {
                  id: 'duration', label: 'Duration', value: duration, onChange: setDuration,
                  options: [{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Long' }],
                },
                {
                  id: 'balance', label: 'Balance', value: balance, onChange: setBalance,
                  options: [{ value: 'video', label: 'Videos' }, { value: 'mixed', label: 'Mixed' }, { value: 'text', label: 'Articles' }],
                },
                {
                  id: 'freshness', label: 'Freshness', value: freshness, onChange: setFreshness,
                  options: [{ value: 'any', label: 'Any time' }, { value: '6m', label: '6 months' }, { value: '1y', label: '1 year' }, { value: '2y', label: '2 years' }],
                },
              ].map((f) => (
                <div key={f.id} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !goal.trim() || create.isPending}
          >
            {create.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WorkspacesPage() {
  const workspaces = trpc.workspaces.list.useQuery();

  if (workspaces.isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            {workspaces.data?.length === 0
              ? 'Create your first learning workspace.'
              : `${workspaces.data?.length} workspace${workspaces.data?.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {workspaces.data?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">No workspaces yet</p>
              <p className="text-sm text-muted-foreground">
                A workspace is a focused space for one learning goal.
              </p>
            </div>
            <CreateWorkspaceDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {workspaces.data?.map((ws) => {
            const pct = ws.progress.total > 0
              ? Math.round((ws.progress.completed / ws.progress.total) * 100)
              : 0;
            return (
              <Link key={ws.id} href={`/workspaces/${ws.id}`}>
                <Card className="transition-all hover:border-accent/40 hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Target className="h-5 w-5 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium leading-none">{ws.title}</p>
                        {ws.progress.total > 0 && (
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {ws.progress.completed}/{ws.progress.total}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">{ws.goal}</p>
                      {ws.progress.total > 0 && (
                        <Progress value={pct} className="h-1" />
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">
                      {new Date(ws.lastOpenedAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
