"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/react";
import {
  balanceSchema,
  durationSchema,
  freshnessSchema,
  levelSchema,
  type WorkspaceFilters,
} from "@kubertube/core/filters";

export default function NewWorkspacePage() {
  const settings = trpc.settings.get.useQuery();
  if (!settings.data) {
    return (
      <p className="mx-auto max-w-xl px-6 py-10 text-sm text-muted">
        Loading...
      </p>
    );
  }
  return (
    <NewWorkspaceForm
      initialFilters={{
        level: settings.data.defaultLevel,
        duration: settings.data.defaultDuration,
        balance: settings.data.defaultBalance,
        freshness: settings.data.defaultFreshness,
      }}
    />
  );
}

function NewWorkspaceForm({
  initialFilters,
}: {
  initialFilters: WorkspaceFilters;
}) {
  const router = useRouter();
  const create = trpc.workspaces.create.useMutation({
    onSuccess: (workspace) => {
      router.replace(`/app/workspaces/${workspace.id}`);
    },
  });

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [filters, setFilters] = useState<WorkspaceFilters>(initialFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ title: title.trim(), goal: goal.trim(), filters });
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">New workspace</h1>
      <p className="mt-1 text-sm text-muted">
        Опиши тему / цель. Подбор материалов запустится отсюда в Phase 2.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
            placeholder="e.g. Понять трансформеры"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Goal</Label>
          <textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={4000}
            required
            rows={4}
            placeholder="Что именно хочешь понять / уметь к концу сессии."
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none transition placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          {advancedOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Advanced filters
        </button>

        {advancedOpen ? (
          <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-2">
            <FilterSelect
              label="Level"
              value={filters.level}
              options={levelSchema.options}
              onChange={(v) => setFilters({ ...filters, level: v })}
            />
            <FilterSelect
              label="Duration"
              value={filters.duration}
              options={durationSchema.options}
              onChange={(v) => setFilters({ ...filters, duration: v })}
            />
            <FilterSelect
              label="Balance"
              value={filters.balance}
              options={balanceSchema.options}
              onChange={(v) => setFilters({ ...filters, balance: v })}
            />
            <FilterSelect
              label="Freshness"
              value={filters.freshness}
              options={freshnessSchema.options}
              onChange={(v) => setFilters({ ...filters, freshness: v })}
            />
          </div>
        ) : null}

        {create.error ? (
          <p className="text-sm text-red-600">{create.error.message}</p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create workspace"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
