'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  getCurrentTime(): number;
  seekTo(secs: number, allowSeekAhead: boolean): void;
  destroy(): void;
}

interface VideoPlayerProps {
  resourceId: string;
  videoId: string;
  startSeconds?: number;
  onTimeUpdate?: (secs: number) => void;
  playerRef?: React.MutableRefObject<YTPlayer | null>;
}

function loadYTAPI(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const existing = document.getElementById('yt-api-script');
    if (!existing) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
}

export function VideoPlayer({
  resourceId,
  videoId,
  startSeconds = 0,
  onTimeUpdate,
  playerRef: externalRef,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalRef = useRef<YTPlayer | null>(null);
  const playerRef = externalRef ?? internalRef;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateProgress = trpc.resources.updateProgress.useMutation();

  const saveProgress = useCallback(
    (secs: number, completed = false) => {
      updateProgress.mutate({ id: resourceId, progressSeconds: secs, isCompleted: completed });
    },
    [resourceId, updateProgress],
  );

  useEffect(() => {
    let player: YTPlayer | null = null;

    loadYTAPI().then(() => {
      if (!containerRef.current) return;
      player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          enablejsapi: 1,
          autoplay: 0,
          start: startSeconds,
        },
        events: {
          onReady: (e) => {
            playerRef.current = e.target;
          },
          onStateChange: (e) => {
            const { PlayerState } = window.YT;
            if (e.data === PlayerState.ENDED) {
              const t = e.target.getCurrentTime();
              saveProgress(Math.floor(t), true);
              e.target.stopVideo();
            }
            if (e.data === PlayerState.PLAYING) {
              intervalRef.current = setInterval(() => {
                const t = e.target.getCurrentTime();
                onTimeUpdate?.(t);
                saveProgress(Math.floor(t));
              }, 10_000);
            } else {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
          },
        },
      });
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      player?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  return (
    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full rounded-lg" />
    </div>
  );
}
