"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef } from "react";
import { extractYouTubeId } from "@kubertube/core/url";
import { NotesEditor } from "@/components/viewer/notes-editor";
import { ReaderView } from "@/components/viewer/reader-view";
import { SummarySection } from "@/components/viewer/summary-section";
import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/viewer/youtube-player";
import { trpc } from "@/lib/trpc/react";

interface InitialResource {
  id: string;
  workspaceId: string;
  url: string;
  type: "video" | "article";
  source: "youtube" | "web";
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | Date | null;
  progressSeconds: number;
  isCompleted: boolean;
  metadata: unknown;
}

export function ResourceViewer({
  workspaceId,
  resource,
}: {
  workspaceId: string;
  resource: InitialResource;
}) {
  const updateProgress = trpc.resources.updateProgress.useMutation();
  const playerRef = useRef<YouTubePlayerHandle | null>(null);

  const videoId =
    resource.type === "video" ? extractYouTubeId(resource.url, resource.metadata) : null;

  const handleProgress = useCallback(
    (seconds: number, kind: "tick" | "pause" | "end") => {
      updateProgress.mutate({
        id: resource.id,
        progressSeconds: Math.max(0, Math.floor(seconds)),
        ...(kind === "end" ? { isCompleted: true } : {}),
      });
    },
    [resource.id, updateProgress],
  );

  const getCurrentSeconds = useCallback(() => {
    return playerRef.current ? Math.max(0, playerRef.current.getCurrentTime()) : 0;
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        href={`/app/workspaces/${workspaceId}`}
        className="inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to workspace
      </Link>

      <h1 className="mt-3 text-xl font-semibold leading-tight">{resource.title}</h1>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {resource.type === "video" && videoId ? (
            <YouTubePlayer
              videoId={videoId}
              initialSeconds={resource.progressSeconds}
              onPlayerReady={(handle) => {
                playerRef.current = handle;
              }}
              onProgress={handleProgress}
            />
          ) : null}

          {resource.type === "article" ? (
            <ReaderView url={resource.url} resourceId={resource.id} />
          ) : null}

          {resource.type === "video" && !videoId ? (
            <div className="rounded-md border border-dashed border-border bg-card p-6 text-sm text-muted">
              Couldn't find a YouTube video id for this resource.{" "}
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Open original
              </a>
            </div>
          ) : null}

          <SummarySection resourceId={resource.id} />
        </div>

        <aside className="space-y-3">
          <NotesEditor
            resourceId={resource.id}
            getCurrentSeconds={resource.type === "video" ? getCurrentSeconds : undefined}
          />
        </aside>
      </div>
    </div>
  );
}
