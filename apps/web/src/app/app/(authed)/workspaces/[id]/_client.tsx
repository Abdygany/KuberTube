"use client";

import { FileText, RefreshCw, Search, Trash2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import {
  defaultFilters,
  workspaceFiltersSchema,
  type WorkspaceFilters,
} from "@kubertube/core/filters";

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
  const filters: WorkspaceFilters = workspaceFiltersSchema.safeParse(initial.filtersJson).data ?? defaultFilters;

  const softDelete = trpc.workspaces.softDelete.useMutation({
    onSuccess: () => {
      router.replace("/app");
      router.refresh();
    },
  });

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{initial.title}</h1>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{initial.goal}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <Chip>{filters.level}</Chip>
          <Chip>{filters.duration}</Chip>
          <Chip icon={<BalanceIcon balance={filters.balance} />}>{filters.balance}</Chip>
          <Chip>freshness: {filters.freshness}</Chip>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button disabled title="Поиск подключается в Phase 2">
          <Search className="mr-1.5 h-4 w-4" />
          Refresh selection
        </Button>
        <Button variant="secondary" disabled title="Phase 2">
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Re-run filters
        </Button>
        <span className="ml-auto" />
        {confirmingDelete ? (
          <>
            <span className="text-xs text-muted">Delete this workspace?</span>
            <Button
              variant="ghost"
              onClick={() => setConfirmingDelete(false)}
              disabled={softDelete.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => softDelete.mutate({ id: initial.id })}
              disabled={softDelete.isPending}
            >
              {softDelete.isPending ? "Deleting..." : "Confirm delete"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Resources</h2>
        <div className="mt-3 rounded-md border border-dashed border-border bg-card p-10 text-center">
          <Search className="mx-auto h-7 w-7 text-muted" />
          <h3 className="mt-3 text-sm font-medium">No resources yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
            Подбор по теме и фильтрам через YouTube + Brave Search будет подключён в
            Phase 2. Ты сможешь добавлять найденные материалы в этот workspace.
          </p>
        </div>
      </section>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
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
