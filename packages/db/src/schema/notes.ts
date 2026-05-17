import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { resources } from "./resources";

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    contentMd: text("content_md").notNull().default(""),
    /** Null for the main note; set for timecode-anchored notes on videos. */
    timestampSeconds: integer("timestamp_seconds"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    resourceIdx: index("notes_resource_idx")
      .on(table.resourceId, table.timestampSeconds)
      .where(sql`deleted_at is null`),
  }),
);
