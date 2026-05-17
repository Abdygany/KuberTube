import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import {
  balanceSchema,
  durationSchema,
  freshnessSchema,
  levelSchema,
} from "@kubertube/core/filters";
import { users } from "./users";

export const levelEnum = pgEnum("user_level", levelSchema.options);
export const durationEnum = pgEnum("user_duration", durationSchema.options);
export const balanceEnum = pgEnum("user_balance", balanceSchema.options);
export const freshnessEnum = pgEnum("user_freshness", freshnessSchema.options);
export const themeEnum = pgEnum("ui_theme", ["light", "dark", "system"]);

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  defaultLevel: levelEnum("default_level").notNull().default("beginner"),
  defaultDuration: durationEnum("default_duration").notNull().default("medium"),
  defaultBalance: balanceEnum("default_balance").notNull().default("mixed"),
  defaultFreshness: freshnessEnum("default_freshness").notNull().default("any"),
  uiTheme: themeEnum("ui_theme").notNull().default("system"),
  uiLanguage: text("ui_language").notNull().default("en"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
