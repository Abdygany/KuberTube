"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/react";

export function SummarySection({ resourceId }: { resourceId: string }) {
  const utils = trpc.useUtils();
  const summaries = trpc.summaries.byResource.useQuery({ resourceId });
  const create = trpc.summaries.create.useMutation({
    onSuccess: () => utils.summaries.byResource.invalidate({ resourceId }),
  });
  const remove = trpc.summaries.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.summaries.byResource.cancel({ resourceId });
      const previous = utils.summaries.byResource.getData({ resourceId });
      utils.summaries.byResource.setData({ resourceId }, (list) =>
        (list ?? []).filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        utils.summaries.byResource.setData({ resourceId }, ctx.previous);
      }
    },
  });

  const [debounceUntil, setDebounceUntil] = useState(0);
  const busy = create.isPending || Date.now() < debounceUntil;

  function generate(type: "short" | "detailed") {
    setDebounceUntil(Date.now() + 5_000);
    create.mutate({ resourceId, type });
  }

  return (
    <section className="mt-8 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">
          AI summary
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => generate("short")} disabled={busy} className="h-8 px-2 text-xs">
            <Sparkles className="mr-1 h-3 w-3" />
            {create.isPending ? "Summarizing..." : "Short summary"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => generate("detailed")}
            disabled={busy}
            className="h-8 px-2 text-xs"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            Detailed
          </Button>
        </div>
      </header>

      {create.error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{create.error.message}</p>
      ) : null}

      {summaries.data && summaries.data.length === 0 ? (
        <p className="text-xs text-muted">
          Anthropic-powered резюме материала. Нужен ключ в{" "}
          <a className="underline" href="/app/settings">
            Settings
          </a>
          .
        </p>
      ) : null}

      <div className="space-y-3">
        {(summaries.data ?? []).map((summary) => (
          <article
            key={summary.id}
            className="rounded-md border border-border bg-card p-3 text-sm"
          >
            <header className="mb-2 flex items-center justify-between text-[11px] text-muted">
              <span className="font-mono">
                {summary.summaryType} · {summary.modelUsed} · {summary.tokensUsed} tokens
              </span>
              <div className="flex items-center gap-2">
                <span>{new Date(summary.createdAt).toLocaleString()}</span>
                <button
                  onClick={() => remove.mutate({ id: summary.id })}
                  className="text-muted transition hover:text-red-600"
                  aria-label="Delete summary"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </header>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {summary.contentMd}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
