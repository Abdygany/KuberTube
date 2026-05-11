import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth.js';

export type WorkspaceFilters = {
  level?: 'beginner' | 'intermediate' | 'advanced';
  duration?: 'short' | 'medium' | 'long';
  balance?: 'video' | 'text' | 'mixed';
  freshness?: 'any' | '6m' | '1y' | '2y';
};

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    goal: text().notNull(),
    filtersJson: jsonb().$type<WorkspaceFilters>().notNull().default({}),
    metadataJson: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastOpenedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('workspaces_user_idx').on(t.userId),
    index('workspaces_deleted_idx').on(t.deletedAt),
  ],
);

export type Workspace = typeof workspaces.$inferSelect;
