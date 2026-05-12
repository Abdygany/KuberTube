import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { resources } from "./resources";

export const summaryTypeEnum = pgEnum("summary_type", ["short", "detailed"]);

export const resourceSummaries = pgTable(
  "resource_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    contentMd: text("content_md").notNull(),
    summaryType: summaryTypeEnum("summary_type").notNull(),
    modelUsed: text("model_used").notNull(),
    tokensUsed: integer("tokens_used").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    resourceIdx: index("resource_summaries_resource_idx").on(table.resourceId, table.createdAt.desc()),
  }),
);
