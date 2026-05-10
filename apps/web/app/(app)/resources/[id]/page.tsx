'use client';

import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRef, useState } from 'react';
import { NoteEditor } from '@/components/note-editor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { ArticleReader } from './article-reader';
import { VideoPlayer } from './video-player';

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([A-Za-z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

export default function ResourcePage() {
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const playerTimeRef = useRef(0);
  const playerRef = useRef<{ getCurrentTime: () => number } | null>(null);

  const resource = trpc.resources.get.useQuery({ id: params.id });
  const notes = trpc.notes.list.useQuery(
    { resourceId: params.id },
    { enabled: !!params.id },
  );
  const updateProgress = trpc.resources.updateProgress.useMutation({
    onSuccess: () => utils.resources.get.invalidate({ id: params.id }),
  });

  function toggleComplete() {
    if (!resource.data) return;
    updateProgress.mutate({
      id: params.id,
      progressSeconds: resource.data.progressSeconds,
      isCompleted: !resource.data.isCompleted,
    });
  }

  if (resource.isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!resource.data) {
    return (
      <div className="container py-10 text-center text-muted-foreground">
        Resource not found.
      </div>
    );
  }

  const r = resource.data;
  const videoId = r.type === 'video' ? extractYouTubeId(r.url) : null;
  const existingNote = notes.data?.[0];

  return (
    <div className="container max-w-4xl space-y-6 py-8">
      {/* Back */}
      <Link
        href={`/workspaces/${r.workspaceId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to workspace
      </Link>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {r.source}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {r.type}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold leading-snug">{r.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={toggleComplete}
            disabled={updateProgress.isPending}
          >
            {r.isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                Completed
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark complete
              </>
            )}
          </Button>
          <Button asChild variant="ghost" size="icon" title="Open original">
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* Content */}
      {r.type === 'video' && videoId ? (
        <div className="space-y-6">
          <VideoPlayer
            resourceId={params.id}
            videoId={videoId}
            startSeconds={r.progressSeconds}
            onTimeUpdate={(t) => { playerTimeRef.current = t; }}
            playerRef={playerRef as React.MutableRefObject<{ getCurrentTime: () => number; playVideo: () => void; pauseVideo: () => void; stopVideo: () => void; seekTo: (s: number, b: boolean) => void; destroy: () => void } | null>}
          />
          <NoteEditor
            resourceId={params.id}
            noteId={existingNote?.id}
            initialContent={existingNote?.contentMd ?? ''}
            getPlayerTime={() => playerTimeRef.current}
          />
        </div>
      ) : r.type === 'video' ? (
        <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
          <p>Could not extract YouTube video ID.</p>
          <Button asChild variant="outline" className="mt-3 gap-2">
            <a href={r.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Watch on YouTube
            </a>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          <ArticleReader url={r.url} />
          <NoteEditor
            resourceId={params.id}
            noteId={existingNote?.id}
            initialContent={existingNote?.contentMd ?? ''}
          />
        </div>
      )}
    </div>
  );
}
