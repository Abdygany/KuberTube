"use client";

import { Check, ExternalLink, FileText, Play, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DisplayResource {
  title: string;
  description?: string | null;
  url: string;
  source: "youtube" | "web";
  type: "video" | "article";
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  publishedAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface ResourceCardProps {
  resource: DisplayResource;
  variant: "suggestion" | "saved";
  isSaved?: boolean;
  isCompleted?: boolean;
  busy?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onToggleCompleted?: () => void;
}

export function ResourceCard({
  resource,
  variant,
  isSaved,
  isCompleted,
  busy,
  onAdd,
  onRemove,
  onToggleCompleted,
}: ResourceCardProps) {
  const isVideo = resource.type === "video";
  const duration = isVideo && resource.durationSeconds ? formatDuration(resource.durationSeconds) : null;
  const published = resource.publishedAt ? new Date(resource.publishedAt) : null;
  const domain = resource.source === "web" ? domainFromMetadataOrUrl(resource) : null;
  const channel =
    resource.source === "youtube" && typeof resource.metadata?.channelTitle === "string"
      ? resource.metadata.channelTitle
      : null;

  return (
    <article
      className={cn(
        "flex gap-3 rounded-md border border-border bg-card p-3 transition",
        isCompleted && "opacity-60",
      )}
    >
      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded bg-background">
        {resource.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            {isVideo ? <Video className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
          </div>
        )}
        {duration ? (
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 font-mono text-[10px] text-white">
            {duration}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug">{resource.title}</h3>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted transition hover:text-foreground"
            aria-label="Open original in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {resource.description ? (
          <p className="line-clamp-2 text-xs text-muted">{resource.description}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1">
            {isVideo ? <Play className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {resource.source === "youtube" ? "YouTube" : "Web"}
          </span>
          {channel ? <span>· {channel}</span> : null}
          {domain ? <span>· {domain}</span> : null}
          {published ? <span>· {published.toLocaleDateString()}</span> : null}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {variant === "suggestion" ? (
            <Button
              variant={isSaved ? "secondary" : "primary"}
              onClick={onAdd}
              disabled={busy || isSaved}
              className="h-8 px-2 text-xs"
            >
              {isSaved ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  In workspace
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={onToggleCompleted}
                disabled={busy}
                className="h-8 px-2 text-xs"
              >
                <Check className={cn("mr-1 h-3 w-3", isCompleted && "text-emerald-600")} />
                {isCompleted ? "Completed" : "Mark complete"}
              </Button>
              <Button
                variant="ghost"
                onClick={onRemove}
                disabled={busy}
                className="h-8 px-2 text-xs"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function formatDuration(total: number): string {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function domainFromMetadataOrUrl(resource: DisplayResource): string | null {
  if (typeof resource.metadata?.domain === "string") return resource.metadata.domain;
  try {
    return new URL(resource.url).hostname;
  } catch {
    return null;
  }
}
