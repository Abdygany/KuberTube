/** `m:ss` for `<1h`, `h:mm:ss` otherwise. Used by video duration chips + timecode labels. */
export function formatSeconds(total: number): string {
  if (!Number.isFinite(total) || total < 0) return "0:00";
  const t = Math.floor(total);
  const hours = Math.floor(t / 3600);
  const minutes = Math.floor((t % 3600) / 60);
  const seconds = t % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
