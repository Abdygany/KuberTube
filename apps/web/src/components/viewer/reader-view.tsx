"use client";

import { ExternalLink } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { trpc } from "@/lib/trpc/react";

interface Props {
  url: string;
  resourceId: string;
}

const SCROLL_KEY = (id: string) => `kubertube:scroll:${id}`;

export function ReaderView({ url, resourceId }: Props) {
  const parse = trpc.reader.parse.useQuery({ url });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!parse.data || !containerRef.current) return;
    const stored = localStorage.getItem(SCROLL_KEY(resourceId));
    if (stored) {
      const y = Number(stored);
      if (Number.isFinite(y) && y > 0) window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
    }
  }, [parse.data, resourceId]);

  useEffect(() => {
    let pending: number | null = null;
    function onScroll() {
      if (pending !== null) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        localStorage.setItem(SCROLL_KEY(resourceId), String(window.scrollY));
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (pending !== null) cancelAnimationFrame(pending);
    };
  }, [resourceId]);

  if (parse.isLoading) {
    return <p className="text-sm text-muted">Parsing article...</p>;
  }
  if (parse.error) {
    return (
      <div className="space-y-3 rounded-md border border-dashed border-border bg-card p-6">
        <p className="text-sm text-muted">{parse.error.message}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-card"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open original on {safeHost(url)}
        </a>
      </div>
    );
  }
  if (!parse.data) return null;
  return (
    <article ref={containerRef} className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold leading-tight">{parse.data.title}</h2>
        {parse.data.byline ? (
          <p className="text-xs text-muted">{parse.data.byline}</p>
        ) : null}
      </header>
      <div
        className="reader-content font-serif text-[17px] leading-relaxed"
        dangerouslySetInnerHTML={{ __html: parse.data.contentHtml }}
      />
    </article>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "the original site";
  }
}
