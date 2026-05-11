import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { workspaces } from './workspace.js';

export const resources = pgTable(
  'resources',
  {
    id: uuid().primaryKey().defaultRandom(),
    workspaceId: uuid()
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    url: text().notNull(),
    type: text({ enum: ['video', 'article'] }).notNull(),
    source: text({ enum: ['youtube', 'web'] }).notNull(),
    title: text().notNull(),
    description: text(),
    thumbnailUrl: text(),
    durationSeconds: integer(),
    publishedAt: timestamp({ withTimezone: true }),
    metadataJson: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    savedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastOpenedAt: timestamp({ withTimezone: true }),
    progressSeconds: integer().notNull().default(0),
    isCompleted: boolean().notNull().default(false),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('resources_workspace_idx').on(t.workspaceId),
    index('resources_deleted_idx').on(t.deletedAt),
  ],
);

export const notes = pgTable(
  'notes',
  {
    id: uuid().primaryKey().defaultRandom(),
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    contentMd: text().notNull().default(''),
    timestampSeconds: integer(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('notes_resource_idx').on(t.resourceId)],
);

/**
 * Готовая зона под Should-фазу (AI-резюме). Создаётся заранее, чтобы
 * не делать миграцию при включении.
 */
export const resourceSummaries = pgTable(
  'resource_summaries',
  {
    id: uuid().primaryKey().defaultRandom(),
    resourceId: uuid()
      .notNull()
      .references(() => resources.id, { onDelete: 'cascade' }),
    contentMd: text().notNull(),
    summaryType: text({ enum: ['short', 'detailed'] }).notNull(),
    modelUsed: text().notNull(),
    tokensUsed: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('resource_summaries_resource_idx').on(t.resourceId)],
);

export type Resource = typeof resources.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ResourceSummary = typeof resourceSummaries.$inferSelect;
