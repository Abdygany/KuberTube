'use client';

import { Check, Eye, EyeOff, Key, Loader2, Moon, Sun, SunMoon, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { signOut, useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { useTheme } from 'next-themes';

type Provider = 'youtube' | 'brave' | 'anthropic';

function ApiKeyRow({
  provider,
  label,
  description,
  required,
}: {
  provider: Provider;
  label: string;
  description: string;
  required?: boolean;
}) {
  const utils = trpc.useUtils();
  const keys = trpc.keys.list.useQuery();
  const upsert = trpc.keys.upsert.useMutation({ onSuccess: () => utils.keys.list.invalidate() });
  const remove = trpc.keys.delete.useMutation({ onSuccess: () => utils.keys.list.invalidate() });
  const validate = trpc.keys.validate.useMutation({ onSuccess: () => utils.keys.list.invalidate() });

  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);

  const existing = keys.data?.find((k) => k.provider === provider);

  async function handleSave() {
    if (!value.trim()) return;
    await upsert.mutateAsync({ provider, key: value.trim() });
    setValue('');
    setOpen(false);
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {required && (
            <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
              required
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {existing && (
          <div className="flex items-center gap-2 pt-0.5">
            <span
              className={`flex items-center gap-1 text-xs ${existing.isValid ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
            >
              {existing.isValid ? (
                <>
                  <Check className="h-3 w-3" /> Valid
                </>
              ) : (
                'Not validated'
              )}
            </span>
            {existing.lastUsedAt && (
              <span className="text-xs text-muted-foreground">
                · Used {new Date(existing.lastUsedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {existing && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => validate.mutate({ provider })}
              disabled={validate.isPending}
            >
              {validate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate({ provider })}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant={existing ? 'outline' : 'default'} size="sm">
              <Key className="mr-1.5 h-3.5 w-3.5" />
              {existing ? 'Replace' : 'Add key'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{existing ? 'Replace' : 'Add'} {label} key</DialogTitle>
              <DialogDescription>
                Your key is encrypted with AES-256-GCM before storage. It is only decrypted on the
                server when making API requests on your behalf.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Paste your key here"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!value.trim() || upsert.isPending}>
                {upsert.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const utils = trpc.useUtils();

  const settings = trpc.user.settings.useQuery();
  const updateSettings = trpc.user.updateSettings.useMutation({
    onSuccess: () => utils.user.settings.invalidate(),
  });
  const updateMe = trpc.user.updateMe.useMutation({
    onSuccess: () => utils.user.me.invalidate(),
  });
  const deleteAccount = trpc.user.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut();
      router.replace('/');
    },
  });

  const [name, setName] = useState(session?.user?.name ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  if (settings.isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl space-y-8 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, defaults, and API keys.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{session?.user?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Button
                variant="outline"
                onClick={() => updateMe.mutate({ name })}
                disabled={updateMe.isPending || name === session?.user?.name}
              >
                {updateMe.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose your preferred theme.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: SunMoon },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => {
                  setTheme(value);
                  updateSettings.mutate({ uiTheme: value });
                }}
                className={`flex flex-1 flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-all ${
                  theme === value
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-border hover:border-accent/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Search defaults</CardTitle>
          <CardDescription>Applied when creating new workspaces. Override per workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              id: 'level',
              label: 'Default level',
              value: settings.data?.defaultLevel ?? 'intermediate',
              options: [
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ],
              onChange: (v: string) => updateSettings.mutate({ defaultLevel: v as 'beginner' | 'intermediate' | 'advanced' }),
            },
            {
              id: 'duration',
              label: 'Session length',
              value: settings.data?.defaultDuration ?? 'medium',
              options: [
                { value: 'short', label: 'Short (< 20 min)' },
                { value: 'medium', label: 'Medium (20–60 min)' },
                { value: 'long', label: 'Long (> 1 hour)' },
              ],
              onChange: (v: string) => updateSettings.mutate({ defaultDuration: v as 'short' | 'medium' | 'long' }),
            },
            {
              id: 'balance',
              label: 'Content balance',
              value: settings.data?.defaultBalance ?? 'mixed',
              options: [
                { value: 'video', label: 'Videos only' },
                { value: 'mixed', label: 'Mixed' },
                { value: 'text', label: 'Articles only' },
              ],
              onChange: (v: string) => updateSettings.mutate({ defaultBalance: v as 'video' | 'text' | 'mixed' }),
            },
            {
              id: 'freshness',
              label: 'Content freshness',
              value: settings.data?.defaultFreshness ?? 'any',
              options: [
                { value: 'any', label: 'Any time' },
                { value: '6m', label: 'Last 6 months' },
                { value: '1y', label: 'Last year' },
                { value: '2y', label: 'Last 2 years' },
              ],
              onChange: (v: string) => updateSettings.mutate({ defaultFreshness: v as 'any' | '6m' | '1y' | '2y' }),
            },
          ].map((field) => (
            <div key={field.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={field.id} className="shrink-0 text-sm">
                {field.label}
              </Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id={field.id} className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Learnspace uses your own API keys. They are encrypted before storage and never logged.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <ApiKeyRow
            provider="youtube"
            label="YouTube Data API v3"
            description="Required for video search. Free — 10,000 units/day."
            required
          />
          <ApiKeyRow
            provider="brave"
            label="Brave Search API"
            description="Required for web search. $3/1,000 requests — 2,000 free/month."
            required
          />
          <ApiKeyRow
            provider="anthropic"
            label="Anthropic API"
            description="Optional. Used for AI summaries (coming soon)."
          />
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">
                Permanently deletes your account and all associated data.
              </p>
            </div>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                  <DialogDescription>
                    This cannot be undone. All workspaces, resources, notes, and API keys will be
                    permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label>Type <strong>delete my account</strong> to confirm</Label>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="delete my account"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteConfirm !== 'delete my account' || deleteAccount.isPending}
                    onClick={() => deleteAccount.mutate()}
                  >
                    {deleteAccount.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Delete forever
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
