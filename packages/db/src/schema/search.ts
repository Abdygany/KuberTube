import { index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  queryText: text('query_text').notNull(),
  filtersJson: jsonb('filters_json').notNull().default({}),
  resultsCount: integer('results_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const searchResultsCache = pgTable(
  'search_results_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queryHash: text('query_hash').notNull(),
    provider: text('provider', { enum: ['youtube', 'brave'] }).notNull(),
    resultsJson: jsonb('results_json').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    queryHashIdx: index('search_cache_query_hash_idx').on(table.queryHash, table.provider),
    expiresAtIdx: index('search_cache_expires_at_idx').on(table.expiresAt),
  }),
);
