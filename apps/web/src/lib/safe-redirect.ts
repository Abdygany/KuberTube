/**
 * Returns `raw` if it is a safe local path (starts with `/`, not `//`,
 * not `/\`), otherwise `fallback`. Used to neutralize open-redirect
 * abuse via query parameters like `?next=//evil.com`.
 */
export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback = "/app",
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}
