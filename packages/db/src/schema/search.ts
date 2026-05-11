import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { workspaces } from './workspace.js';

export const searchQueries = pgTable(
  'search_queries',
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    queryText: text().notNull(),
    filtersJson: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    resultsCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('search_queries_workspace_idx').on(t.workspaceId)],
);

/**
 * Кэш поисковых ответов провайдеров. TTL 24 часа (PROJECT.pdf §3).
 * queryHash = sha256(query + filters + provider).
 */
export const searchResultsCache = pgTable(
  'search_results_cache',
  {
    id: uuid().primaryKey().defaultRandom(),
    queryHash: text().notNull(),
    provider: text({ enum: ['youtube', 'brave'] }).notNull(),
    resultsJson: jsonb().$type<Record<string, unknown>[]>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    index('search_cache_hash_provider_idx').on(t.queryHash, t.provider),
    index('search_cache_expires_idx').on(t.expiresAt),
  ],
);

export type SearchQuery = typeof searchQueries.$inferSelect;
export type SearchResultsCacheRow = typeof searchResultsCache.$inferSelect;
