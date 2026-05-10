import { z } from 'zod';

export const LevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const DurationSchema = z.enum(['short', 'medium', 'long']);
export const BalanceSchema = z.enum(['video', 'text', 'mixed']);
export const FreshnessSchema = z.enum(['any', '6m', '1y', '2y']);
export const ThemeSchema = z.enum(['light', 'dark', 'system']);
export const ProviderSchema = z.enum(['youtube', 'brave', 'anthropic']);

export const WorkspaceFiltersSchema = z.object({
  level: LevelSchema.optional(),
  duration: DurationSchema.optional(),
  balance: BalanceSchema.optional(),
  freshness: FreshnessSchema.optional(),
});

export const ResourceTypeSchema = z.enum(['video', 'article']);
export const ResourceSourceSchema = z.enum(['youtube', 'web']);
