"use client";

import { CheckCircle2, Key, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";
import { providerSchema, type Provider } from "@kubertube/core/key-validators";

const PROVIDER_META: Record<Provider, { label: string; hint: string; required: boolean }> = {
  youtube: {
    label: "YouTube Data API",
    hint: "console.cloud.google.com → APIs & Services → Credentials",
    required: true,
  },
  brave: {
    label: "Brave Search API",
    hint: "api.search.brave.com → Subscriptions (free tier: 2000 requests/month)",
    required: true,
  },
  anthropic: {
    label: "Anthropic API",
    hint: "console.anthropic.com → API Keys. Опционально, нужен только для AI-резюме.",
    required: false,
  },
};

export function KeysSection() {
  const list = trpc.keys.list.useQuery();
  const stored = list.data ?? [];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-medium">API keys</h2>
        <p className="text-xs text-muted">
          Хранятся зашифрованными (AES-256-GCM) на бэкенде. Никогда не показываем
          полный ключ — только последние 4 символа.
        </p>
      </header>
      <div className="space-y-3">
        {providerSchema.options.map((provider) => {
          const existing = stored.find((row) => row.provider === provider);
          return (
            <ProviderRow
              key={provider}
              provider={provider}
              existing={existing}
              onChange={() => list.refetch()}
            />
          );
        })}
      </div>
    </section>
  );
}

interface ExistingKey {
  id: string;
  provider: Provider;
  keyLast4: string;
  isValid: boolean;
  lastValidatedAt: Date | null;
}

function ProviderRow({
  provider,
  existing,
  onChange,
}: {
  provider: Provider;
  existing: ExistingKey | undefined;
  onChange: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const set = trpc.keys.set.useMutation();
  const remove = trpc.keys.delete.useMutation();
  const revalidate = trpc.keys.revalidate.useMutation();

  const busy = set.isPending || remove.isPending || revalidate.isPending;
  const error = set.error ?? remove.error ?? revalidate.error;

  async function save() {
    await set.mutateAsync({ provider, key: value });
    setValue("");
    setEditing(false);
    onChange();
  }

  async function clear() {
    await remove.mutateAsync({ provider });
    onChange();
  }

  async function check() {
    await revalidate.mutateAsync({ provider });
    onChange();
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted" />
            <span className="text-sm font-medium">{meta.label}</span>
            {meta.required ? (
              <span className="rounded-sm bg-foreground/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                Required
              </span>
            ) : null}
            {existing ? (
              existing.isValid ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Valid
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="h-3 w-3" /> Invalid
                </span>
              )
            ) : null}
          </div>
          <p className="text-xs text-muted">{meta.hint}</p>
          {existing ? (
            <p className="font-mono text-xs text-muted">•••• {existing.keyLast4}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {existing ? (
            <>
              <Button variant="secondary" onClick={check} disabled={busy}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Re-check
              </Button>
              <Button variant="ghost" onClick={clear} disabled={busy}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            </>
          ) : null}
          <Button onClick={() => setEditing((v) => !v)} disabled={busy}>
            {existing ? "Replace" : "Add"}
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-2">
          <Label htmlFor={`${provider}-input`}>New key</Label>
          <Input
            id={`${provider}-input`}
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={provider === "anthropic" ? "sk-ant-..." : ""}
            autoComplete="off"
          />
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={busy || value.trim().length < 10}>
              {set.isPending ? "Validating..." : "Validate & save"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error.message}</p> : null}
    </div>
  );
}
