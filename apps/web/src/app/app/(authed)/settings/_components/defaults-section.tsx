"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";
import type { UserDefaults } from "@kubertube/core/filters";

const FIELDS: Array<{
  key: keyof UserDefaults;
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "defaultLevel",
    label: "Level",
    options: [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ],
  },
  {
    key: "defaultDuration",
    label: "Session duration",
    options: [
      { value: "short", label: "Short" },
      { value: "medium", label: "Medium" },
      { value: "long", label: "Long" },
    ],
  },
  {
    key: "defaultBalance",
    label: "Video/text balance",
    options: [
      { value: "video", label: "Video" },
      { value: "text", label: "Text" },
      { value: "mixed", label: "Mixed" },
    ],
  },
  {
    key: "defaultFreshness",
    label: "Default freshness",
    options: [
      { value: "any", label: "Any" },
      { value: "2y", label: "2y" },
      { value: "1y", label: "1y" },
      { value: "6m", label: "6m" },
    ],
  },
];

export function DefaultsSection() {
  const settings = trpc.settings.get.useQuery();
  const update = trpc.settings.updateDefaults.useMutation();
  const [draft, setDraft] = useState<UserDefaults | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setDraft({
        defaultLevel: settings.data.defaultLevel,
        defaultDuration: settings.data.defaultDuration,
        defaultBalance: settings.data.defaultBalance,
        defaultFreshness: settings.data.defaultFreshness,
      });
    }
  }, [settings.data]);

  async function save() {
    if (!draft) return;
    setSaved(false);
    await update.mutateAsync(draft);
    await settings.refetch();
    setSaved(true);
  }

  if (!draft) {
    return (
      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-medium">Defaults</h2>
        </header>
        <p className="text-xs text-muted">Loading...</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-medium">Defaults</h2>
        <p className="text-xs text-muted">
          Применяются по умолчанию при создании нового workspace.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <select
              id={field.key}
              value={draft[field.key]}
              onChange={(e) =>
                setDraft({ ...draft, [field.key]: e.target.value } as UserDefaults)
              }
              className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving..." : "Save defaults"}
        </Button>
        {saved ? <span className="text-xs text-muted">Saved</span> : null}
        {update.error ? (
          <span className="text-xs text-red-600">{update.error.message}</span>
        ) : null}
      </div>
    </section>
  );
}
