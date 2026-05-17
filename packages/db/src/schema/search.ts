import {
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

export const searchProviderEnum = pgEnum("search_provider", [
  "youtube",
  "brave",
]);

export const searchQueries = pgTable("search_queries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  queryText: text("query_text").notNull(),
  filtersJson: jsonb("filters_json").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const searchResultsCache = pgTable(
  "search_results_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    queryHash: text("query_hash").notNull(),
    provider: searchProviderEnum("provider").notNull(),
    resultsJson: jsonb("results_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    hashProviderUnique: uniqueIndex(
      "search_results_cache_hash_provider_unique",
    ).on(table.queryHash, table.provider),
  }),
);
