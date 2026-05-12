import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const resourceTypeEnum = pgEnum("resource_type", ["video", "article"]);
export const resourceSourceEnum = pgEnum("resource_source", ["youtube", "web"]);

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    type: resourceTypeEnum("type").notNull(),
    source: resourceSourceEnum("source").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    thumbnailUrl: text("thumbnail_url"),
    durationSeconds: integer("duration_seconds"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    metadataJson: jsonb("metadata_json").notNull().default(sql`'{}'::jsonb`),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    progressSeconds: integer("progress_seconds").notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    workspaceSavedIdx: index("resources_workspace_saved_idx")
      .on(table.workspaceId, table.savedAt.desc())
      .where(sql`deleted_at is null`),
    workspaceUrlUnique: uniqueIndex("resources_workspace_url_unique")
      .on(table.workspaceId, table.url)
      .where(sql`deleted_at is null`),
  }),
);
