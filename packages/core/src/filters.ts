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
