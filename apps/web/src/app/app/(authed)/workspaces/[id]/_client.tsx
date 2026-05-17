"use client";

import {
  AlertTriangle,
  Download,
  FileText,
  RefreshCw,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ResourceCard,
  type DisplayResource,
} from "@/components/resources/resource-card";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import {
  defaultFilters,
  workspaceFiltersSchema,
  type WorkspaceFilters,
} from "@kubertube/core/filters";
import type { ResourceCandidate } from "@kubertube/core/search-types";

interface InitialWorkspace {
  id: string;
  title: string;
  goal: string;
  filtersJson: unknown;
  createdAt: Date;
  lastOpenedAt: Date;
}

export function WorkspaceClient({ initial }: { initial: InitialWorkspace }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const filters: WorkspaceFilters =
    workspaceFiltersSchema.safeParse(initial.filtersJson).data ??
    defaultFilters;

  const saved = trpc.resources.listByWorkspace.useQuery({
    workspaceId: initial.id,
  });
  const search = trpc.search.run.useMutation();

  const add = trpc.resources.add.useMutation({
    onSuccess: (row) => {
      utils.resources.listByWorkspace.setData(
        { workspaceId: initial.id },
        (prev) => {
          const list = prev ?? [];
          if (list.some((r) => r.id === row.id)) return list;
          return [row, ...list];
        },
      );
    },
  });
  const remove = trpc.resources.softDelete.useMutation({
    onMutate: async ({ id }) => {
      await utils.resources.listByWorkspace.cancel({ workspaceId: initial.id });
      const previous = utils.resources.listByWorkspace.getData({
        workspaceId: initial.id,
      });
      utils.resources.listByWorkspace.setData(
        { workspaceId: initial.id },
        (list) => (list ?? []).filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        utils.resources.listByWorkspace.setData(
          { workspaceId: initial.id },
          ctx.previous,
        );
      }
    },
  });
  const markComplete = trpc.resources.markCompleted.useMutation({
    onMutate: async ({ id, isCompleted }) => {
      await utils.resources.listByWorkspace.cancel({ workspaceId: initial.id });
      const previous = utils.resources.listByWorkspace.getData({
        workspaceId: initial.id,
      });
      utils.resources.listByWorkspace.setData(
        { workspaceId: initial.id },
        (list) =>
          (list ?? []).map((r) => (r.id === id ? { ...r, isCompleted } : r)),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) {
        utils.resources.listByWorkspace.setData(
          { workspaceId: initial.id },
          ctx.previous,
        );
      }
    },
  });
  const softDeleteWorkspace = trpc.workspaces.softDelete.useMutation({
    onSuccess: () => {
      router.replace("/app");
      router.refresh();
    },
  });

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const savedUrls = useMemo(
    () => new Set((saved.data ?? []).map((r) => r.url)),
    [saved.data],
  );

  async function refresh(force: boolean) {
    await search.mutateAsync({ workspaceId: initial.id, force });
  }

  function candidateToDisplay(candidate: ResourceCandidate): DisplayResource {
    return { ...candidate };
  }

  const exportMutation = trpc.workspaces.exportMarkdown.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  });

  function exportToMarkdown() {
    exportMutation.mutate({ id: initial.id });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{initial.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {initial.goal}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <Chip>{filters.level}</Chip>
          <Chip>{filters.duration}</Chip>
          <Chip icon={<BalanceIcon balance={filters.balance} />}>
            {filters.balance}
          </Chip>
          <Chip>freshness: {filters.freshness}</Chip>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => refresh(false)} disabled={search.isPending}>
          <Search className="mr-1.5 h-4 w-4" />
          {search.isPending ? "Searching..." : "Run search"}
        </Button>
        {search.data ? (
          <Button
            variant="secondary"
            onClick={() => refresh(true)}
            disabled={search.isPending}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh selection
          </Button>
        ) : null}
        {(saved.data?.length ?? 0) > 0 ? (
          <Button
            variant="secondary"
            onClick={exportToMarkdown}
            disabled={exportMutation.isPending}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
        ) : null}
        <span className="ml-auto" />
        {confirmingDelete ? (
          <>
            <span className="text-xs text-muted">Delete this workspace?</span>
            <Button
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              disabled={softDeleteWorkspace.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => softDeleteWorkspace.mutate({ id: initial.id })}
              disabled={softDeleteWorkspace.isPending}
            >
              {softDeleteWorkspace.isPending ? "Deleting..." : "Confirm delete"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      {search.error ? (
        <SearchErrorBanner message={search.error.message} />
      ) : null}
      {search.data && search.data.errors.length > 0 ? (
        <PartialSuccessBanner errors={search.data.errors} />
      ) : null}
      {exportMutation.error ? (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          Export failed: {exportMutation.error.message}
        </p>
      ) : null}

      {search.data ? (
        <Section
          title="Suggestions"
          count={search.data.results.length}
          empty="No matches for these filters. Try changing balance or freshness in Settings."
        >
          {search.data.results.map((candidate) => (
            <ResourceCard
              key={`${candidate.source}:${candidate.url}`}
              resource={candidateToDisplay(candidate)}
              variant="suggestion"
              isSaved={savedUrls.has(candidate.url)}
              busy={add.isPending}
              onAdd={() => add.mutate({ workspaceId: initial.id, candidate })}
            />
          ))}
        </Section>
      ) : (
        <p className="mt-8 text-sm text-muted">
          Click <strong className="text-foreground">Run search</strong> to find
          materials for this workspace. Подбор использует YouTube + Brave Search
          с твоими ключами из{" "}
          <Link className="underline" href="/app/settings">
            Settings
          </Link>
          .
        </p>
      )}

      <Section
        title="Saved"
        count={saved.data?.length ?? 0}
        empty="Nothing saved yet. Add a suggestion above."
      >
        {(saved.data ?? []).map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            variant="saved"
            isCompleted={resource.isCompleted}
            busy={remove.isPending || markComplete.isPending}
            onOpen={() =>
              router.push(
                `/app/workspaces/${initial.id}/resources/${resource.id}`,
              )
            }
            onRemove={() => remove.mutate({ id: resource.id })}
            onToggleCompleted={() =>
              markComplete.mutate({
                id: resource.id,
                isCompleted: !resource.isCompleted,
              })
            }
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          {title}
        </h2>
        <span className="text-xs text-muted">{count}</span>
      </header>
      {count === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-xs text-muted">
          {empty}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function SearchErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong>Search failed.</strong> {message}{" "}
        <Link className="underline" href="/app/settings">
          Manage API keys
        </Link>
      </div>
    </div>
  );
}

function PartialSuccessBanner({
  errors,
}: {
  errors: Array<{ provider: string; reason: string }>;
}) {
  return (
    <div className="mt-4 space-y-1 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
      {errors.map((err, index) => (
        <div
          key={`${err.provider}:${index}`}
          className="flex items-start gap-2"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <strong className="capitalize">{err.provider}</strong>: {err.reason}
          </span>
        </div>
      ))}
      <Link className="ml-5 inline-block underline" href="/app/settings">
        Settings → API keys
      </Link>
    </div>
  );
}

function Chip({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-border bg-card px-1.5 py-0.5 text-[11px] uppercase tracking-wide",
        icon && "gap-1",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

function BalanceIcon({ balance }: { balance: WorkspaceFilters["balance"] }) {
  if (balance === "video") return <Video className="h-3 w-3" />;
  if (balance === "text") return <FileText className="h-3 w-3" />;
  return null;
}
