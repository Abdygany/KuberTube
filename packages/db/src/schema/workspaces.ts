import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  goal: text('goal').notNull(),
  filtersJson: jsonb('filters_json').notNull().default({}),
  metadataJson: jsonb('metadata_json').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: text('type', { enum: ['video', 'article'] }).notNull(),
  source: text('source', { enum: ['youtube', 'web'] }).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  metadataJson: jsonb('metadata_json').notNull().default({}),
  savedAt: timestamp('saved_at', { withTimezone: true }).notNull().defaultNow(),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
  progressSeconds: integer('progress_seconds').notNull().default(0),
  isCompleted: boolean('is_completed').notNull().default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
  contentMd: text('content_md').notNull().default(''),
  timestampSeconds: integer('timestamp_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const resourceSummaries = pgTable('resource_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
  contentMd: text('content_md').notNull(),
  summaryType: text('summary_type', { enum: ['short', 'detailed'] }).notNull(),
  modelUsed: text('model_used').notNull(),
  tokensUsed: integer('tokens_used').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
