"use client";

import { useEffect, useRef } from "react";
import YouTube, { type YouTubePlayer as Player, type YouTubeEvent } from "react-youtube";

export interface YouTubePlayerHandle {
  getCurrentTime(): number;
}

interface Props {
  videoId: string;
  initialSeconds: number;
  onPlayerReady?: (handle: YouTubePlayerHandle) => void;
  /** Fired every `progressIntervalMs` while playing AND on pause/end. */
  onProgress?: (seconds: number, kind: "tick" | "pause" | "end") => void;
  progressIntervalMs?: number;
}

/**
 * Wraps `react-youtube` with the parameters PROJECT.pdf §6 mandates
 * (`rel=0`, `modestbranding=1`, `iv_load_policy=3`, `enablejsapi=1`)
 * and intercepts the `ENDED` state to hide the recommendation grid.
 */
export function YouTubePlayer({
  videoId,
  initialSeconds,
  onPlayerReady,
  onProgress,
  progressIntervalMs = 10_000,
}: Props) {
  const playerRef = useRef<Player | null>(null);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onReadyRef = useRef(onPlayerReady);
  onReadyRef.current = onPlayerReady;

  useEffect(() => {
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      // 1 === PLAYING per YouTube IFrame API state codes.
      if (typeof player.getPlayerState === "function" && player.getPlayerState() === 1) {
        onProgressRef.current?.(player.getCurrentTime(), "tick");
      }
    }, progressIntervalMs);
    return () => clearInterval(id);
  }, [progressIntervalMs]);

  useEffect(() => {
    function onHide() {
      const player = playerRef.current;
      if (!player) return;
      try {
        onProgressRef.current?.(player.getCurrentTime(), "pause");
      } catch {
        /* player tore down — ignore */
      }
    }
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  function handleReady(event: YouTubeEvent) {
    playerRef.current = event.target;
    if (initialSeconds > 0) {
      event.target.seekTo(initialSeconds, true);
    }
    onReadyRef.current?.({
      getCurrentTime: () => event.target.getCurrentTime(),
    });
  }

  function handleStateChange(event: YouTubeEvent<number>) {
    if (event.data === 0) {
      // ENDED — stop to hide the related-videos grid (PROJECT.pdf §6).
      event.target.stopVideo();
      onProgressRef.current?.(event.target.getCurrentTime(), "end");
    } else if (event.data === 2) {
      // PAUSED
      onProgressRef.current?.(event.target.getCurrentTime(), "pause");
    }
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
      <YouTube
        videoId={videoId}
        className="h-full w-full"
        iframeClassName="h-full w-full"
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: typeof window === "undefined" ? undefined : window.location.origin,
          },
        }}
        onReady={handleReady}
        onStateChange={handleStateChange}
      />
    </div>
  );
}
