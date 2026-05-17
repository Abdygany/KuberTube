"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";
import {
  balanceSchema,
  durationSchema,
  freshnessSchema,
  levelSchema,
  type UserDefaults,
} from "@kubertube/core/filters";

const FIELDS: Array<{
  key: keyof UserDefaults;
  label: string;
  options: readonly string[];
}> = [
  { key: "defaultLevel", label: "Level", options: levelSchema.options },
  {
    key: "defaultDuration",
    label: "Session duration",
    options: durationSchema.options,
  },
  {
    key: "defaultBalance",
    label: "Video/text balance",
    options: balanceSchema.options,
  },
  {
    key: "defaultFreshness",
    label: "Default freshness",
    options: freshnessSchema.options,
  },
];

export function DefaultsSection() {
  const settings = trpc.settings.get.useQuery();
  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-lg font-medium">Defaults</h2>
        <p className="text-xs text-muted">
          Применяются по умолчанию при создании нового workspace.
        </p>
      </header>
      {settings.data ? (
        <DefaultsForm
          initial={{
            defaultLevel: settings.data.defaultLevel,
            defaultDuration: settings.data.defaultDuration,
            defaultBalance: settings.data.defaultBalance,
            defaultFreshness: settings.data.defaultFreshness,
          }}
          onSaved={() => settings.refetch()}
        />
      ) : (
        <p className="text-xs text-muted">Loading...</p>
      )}
    </section>
  );
}

function DefaultsForm({
  initial,
  onSaved,
}: {
  initial: UserDefaults;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<UserDefaults>(initial);
  const [saved, setSaved] = useState(false);
  const update = trpc.settings.updateDefaults.useMutation();

  async function save() {
    setSaved(false);
    await update.mutateAsync(draft);
    onSaved();
    setSaved(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <select
              id={field.key}
              value={draft[field.key]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [field.key]: e.target.value,
                } as UserDefaults)
              }
              className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
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
    </>
  );
}
