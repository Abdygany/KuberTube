import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { schema as dbSchema } from '@learnspace/db';

import type { Database } from '@learnspace/db';
import type { Env } from './env.js';

export type Auth = ReturnType<typeof createAuth>;

export function createAuth(db: Database, env: Env) {
  return betterAuth({
    secret: env.AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: dbSchema.user,
        session: dbSchema.session,
        account: dbSchema.account,
        verification: dbSchema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    trustedOrigins: [env.WEB_ORIGIN],
  });
}
