import { z } from "zod";

export const levelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export const durationSchema = z.enum(["short", "medium", "long"]);
export const balanceSchema = z.enum(["video", "text", "mixed"]);
export const freshnessSchema = z.enum(["any", "6m", "1y", "2y"]);

/** Per-workspace filters, persisted as `workspaces.filters_json`. */
export const workspaceFiltersSchema = z.object({
  level: levelSchema,
  duration: durationSchema,
  balance: balanceSchema,
  freshness: freshnessSchema,
  languages: z.array(z.string().min(2).max(8)).max(8).optional(),
});

export type WorkspaceFilters = z.infer<typeof workspaceFiltersSchema>;

/** Profile defaults, persisted on `user_settings`. */
export const userDefaultsSchema = z.object({
  defaultLevel: levelSchema,
  defaultDuration: durationSchema,
  defaultBalance: balanceSchema,
  defaultFreshness: freshnessSchema,
});

export type UserDefaults = z.infer<typeof userDefaultsSchema>;

export const defaultFilters: WorkspaceFilters = {
  level: "beginner",
  duration: "medium",
  balance: "mixed",
  freshness: "any",
};

/** RFC 3339 lower bound for `freshness`, or `null` for "any time". */
export function freshnessToPublishedAfter(
  value: WorkspaceFilters["freshness"],
): string | null {
  if (value === "any") return null;
  const now = Date.now();
  const months = value === "6m" ? 6 : value === "1y" ? 12 : 24;
  const cutoff = new Date(now - months * 30 * 24 * 60 * 60 * 1000);
  return cutoff.toISOString();
}

/** Brave's freshness param — `pd|pw|pm|py` or an absolute range for sub-year windows. */
export function freshnessToBraveParam(
  value: WorkspaceFilters["freshness"],
): string | null {
  if (value === "any") return null;
  if (value === "6m") {
    const end = new Date();
    const start = new Date(end.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
    return `${braveDate(start)}to${braveDate(end)}`;
  }
  return "py"; // Brave caps at past-year for both 1y and 2y.
}

/** YouTube's `videoDuration` accepts our short/medium/long verbatim. */
export function durationToYouTubeParam(
  value: WorkspaceFilters["duration"],
): string {
  return value;
}

export function providersForBalance(
  value: WorkspaceFilters["balance"],
): Array<"youtube" | "brave"> {
  if (value === "video") return ["youtube"];
  if (value === "text") return ["brave"];
  return ["youtube", "brave"];
}

function braveDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
