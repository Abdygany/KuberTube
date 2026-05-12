"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced";
import { trpc } from "@/lib/trpc/react";

export function SavedSearch() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);

  const enabled = debounced.length >= 2;
  const results = trpc.search.savedContent.useQuery(
    { q: debounced },
    { enabled, staleTime: 5_000 },
  );

  const grouped = useMemo(() => {
    if (!results.data) return [];
    return results.data;
  }, [results.data]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search saved resources and notes..."
          className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-9 text-sm outline-none transition placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent"
        />
        {query.length > 0 ? (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-foreground"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {enabled && results.isLoading ? (
        <p className="text-xs text-muted">Searching...</p>
      ) : null}

      {enabled && results.data && results.data.length === 0 ? (
        <p className="text-xs text-muted">No matches for "{debounced}".</p>
      ) : null}

      {enabled && grouped.length > 0 ? (
        <ul className="space-y-2 rounded-md border border-border bg-card p-2">
          {grouped.map((hit) => (
            <li key={`${hit.kind}:${hit.resourceId}:${hit.savedAt.toISOString()}`}>
              <Link
                href={`/app/workspaces/${hit.workspaceId}/resources/${hit.resourceId}`}
                className="block rounded-md px-2 py-1.5 transition hover:bg-background"
              >
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-medium">{hit.title}</span>
                  <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {hit.kind === "note" ? "note" : hit.workspaceTitle}
                  </span>
                  {hit.kind === "note" ? (
                    <span className="text-[10px] text-muted">in {hit.workspaceTitle}</span>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-muted">{hit.snippet}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
