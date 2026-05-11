import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { user } from './auth.js';

export const userSettings = pgTable('user_settings', {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  defaultLevel: text({ enum: ['beginner', 'intermediate', 'advanced'] })
    .notNull()
    .default('intermediate'),
  defaultDuration: text({ enum: ['short', 'medium', 'long'] })
    .notNull()
    .default('medium'),
  defaultBalance: text({ enum: ['video', 'text', 'mixed'] })
    .notNull()
    .default('mixed'),
  defaultFreshness: text({ enum: ['any', '6m', '1y', '2y'] })
    .notNull()
    .default('any'),
  uiTheme: text({ enum: ['light', 'dark', 'system'] })
    .notNull()
    .default('system'),
  uiLanguage: text().notNull().default('en'),
  onboardingCompleted: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/**
 * Шифрованные провайдер-ключи пользователя.
 * encryptedKey + keyIv хранятся как hex; мастер-ключ AES-256-GCM —
 * только в env (ENCRYPTION_KEY). Plaintext-ключ никогда не уходит из бэка.
 */
export const userApiKeys = pgTable(
  'user_api_keys',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text({ enum: ['anthropic', 'youtube', 'brave'] }).notNull(),
    encryptedKey: text().notNull(),
    keyIv: text().notNull(),
    keyAuthTag: text().notNull(),
    lastUsedAt: timestamp({ withTimezone: true }),
    lastValidatedAt: timestamp({ withTimezone: true }),
    isValid: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('user_api_keys_user_provider_idx').on(t.userId, t.provider)],
);

export type UserSettings = typeof userSettings.$inferSelect;
export type UserApiKey = typeof userApiKeys.$inferSelect;
export type ApiProvider = UserApiKey['provider'];
