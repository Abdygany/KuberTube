import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { providerSchema } from "@kubertube/core/key-validators";
import { users } from "./users";

export const providerEnum = pgEnum("api_provider", providerSchema.options);

export const userApiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    encryptedKey: text("encrypted_key").notNull(),
    keyLast4: text("key_last4").notNull(),
    keyVersion: text("key_version").notNull().default("v1"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
    isValid: boolean("is_valid").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderUnique: unique("user_api_keys_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    userIdx: index("user_api_keys_user_idx").on(table.userId),
  }),
);
